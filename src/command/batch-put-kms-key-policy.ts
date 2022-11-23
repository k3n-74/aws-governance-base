import { CredentialProvider } from "@aws-sdk/types";
import { Consts as C, AwsGovBaseConfig } from "../consts";
import { getSsoCredential } from "../credential-provider";
import {
  print,
  println,
  isSetupTargetFeature,
  isSetupTargetAwsAccount,
  isSetupTargetRegion,
  listAvailableRegions,
  createAwsAccountIdAndRegionStringWithPad,
} from "../util";
import * as throat from "throat";
import { readFileSync } from "fs";
import { logger } from "../logger";
import * as kms from "@aws-sdk/client-kms";
import * as equal from "fast-deep-equal";
import ac from "ansi-colors";

export type UpdateKeyPolicyFuncInput = {
  awsAccountId: string;
  region: string;
  keyPolicyTemplateString: string;
};

export class BatchPutKmsKeyPolicyCommand {
  public runCommand = async (): Promise<void> => {
    if (C.i.commandOptions.keyPolicyFile == null)
      throw new Error("key-policy-file option is required.");

    // key policy ファイルを読み込む
    const keyPolicyTemplateString = readFileSync(
      C.i.commandOptions.keyPolicyFile,
      "utf-8"
    );

    // アカウント、リージョンに対して順次アップデートしていく
    // 全AWSアカウントのリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const allAwsAccountIds: string[] = C.i.structure.Guests.map((account) => {
      return account.id;
    });
    allAwsAccountIds.push(C.i.structure.Jump.id);
    allAwsAccountIds.push(C.i.structure.Audit.id);

    // All AWS Account
    for (const awsAccountId of allAwsAccountIds) {
      // TODO: listAvailableRegions関数の実行要否について、デプロイ対象のAWSアカウント、リージョンなのかを確認する機能を追加する
      const availableRegions = await listAvailableRegions(awsAccountId);
      // 全リージョン分の引数のリストを作成する
      const updateKeyPolicyFuncInputList: UpdateKeyPolicyFuncInput[] = [];
      for (const region of availableRegions) {
        updateKeyPolicyFuncInputList.push({
          awsAccountId: awsAccountId,
          region: region,
          keyPolicyTemplateString: keyPolicyTemplateString,
        });
      }
      // 最大9並列の範囲内で全リージョンに対して一斉にdeployを実行
      const res = await Promise.all(
        updateKeyPolicyFuncInputList.map(
          throat.default(9, (updateKeyPolicyFuncInput) => {
            return this.updateKeyPolicy(updateKeyPolicyFuncInput);
          })
        )
      );
    }
  };

  private updateKeyPolicy = async (
    updateKeyPolicyFuncInput: UpdateKeyPolicyFuncInput
  ): Promise<void> => {
    const awsAccountIdAndRegionStringWidhPad =
      createAwsAccountIdAndRegionStringWithPad({
        awsAccountId: updateKeyPolicyFuncInput.awsAccountId,
        region: updateKeyPolicyFuncInput.region,
      });
    if (
      isSetupTargetAwsAccount(updateKeyPolicyFuncInput.awsAccountId) &&
      isSetupTargetRegion(updateKeyPolicyFuncInput.region)
    ) {
      // セットアップ対象のAWSアカウント&リージョンだったらセットアップ
      const credential = await getSsoCredential(
        updateKeyPolicyFuncInput.awsAccountId
      );

      // Key Policy テンプレートのAWSアカウントIDとリージョンの文字列置換をする
      // 参考：replaceAll() が使えない件
      // http://propg.ee-mall.info/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0/typescript-%E6%96%87%E5%AD%97%E5%88%97%E7%BD%AE%E3%81%8D%E6%8F%9B%E3%81%88%EF%BD%9Ereplaceall%E3%81%AE%E4%BB%A3%E3%82%8F%E3%82%8A/
      const keyPolicyTemplateStringReplaced =
        updateKeyPolicyFuncInput.keyPolicyTemplateString
          .replace(
            new RegExp("\\$\\{AWS::AccountId\\}", "g"),
            updateKeyPolicyFuncInput.awsAccountId
          )
          .replace(
            new RegExp("\\$\\{AWS::Region\\}", "g"),
            updateKeyPolicyFuncInput.region
          );
      logger.debug(
        "keyPolicyTemplateStringReplaced:\n",
        keyPolicyTemplateStringReplaced
      );
      const keyPolicyTemplateJson = JSON.parse(keyPolicyTemplateStringReplaced);

      const kmsClient = new kms.KMSClient({
        credentials: credential,
        region: updateKeyPolicyFuncInput.region,
      });

      const describeKeyCommandOutput = await kmsClient.send(
        new kms.DescribeKeyCommand({
          KeyId: C.i.commandOptions.keyAliasName,
        })
      );
      logger.debug("DescribeKeyCommandOutput :\n", describeKeyCommandOutput);
      const getKeyPolicyCommandOutput = await kmsClient.send(
        new kms.GetKeyPolicyCommand({
          KeyId: describeKeyCommandOutput.KeyMetadata?.KeyId,
          PolicyName: "default",
        })
      );
      logger.debug("GetKeyPolicyCommandOutput :\n", getKeyPolicyCommandOutput);
      logger.debug("Policy :\n", getKeyPolicyCommandOutput.Policy);
      // logger.info(
      //   "Policy :\n",
      //   JSON.parse(getKeyPolicyCommandOutput.Policy ?? "{}")
      // );

      const isEqual = equal.default(
        keyPolicyTemplateJson,
        JSON.parse(getKeyPolicyCommandOutput.Policy ?? "{}")
      );
      if (isEqual) {
        println(
          `${awsAccountIdAndRegionStringWidhPad}  ->  ${ac.yellow("NO CHANGE")}`
        );
      } else {
        if (C.i.commandOptions.isDryRun) {
          // Dry Run だったら変更予定の旨を出力するだけ。
          println(
            `${awsAccountIdAndRegionStringWidhPad}  ->  ${ac.green(
              "WILL UPDATE"
            )}`
          );
        } else {
          // Rry Run じゃないときは変更を実行する。
          const putKeyPolicyCommandOutput = await kmsClient.send(
            new kms.PutKeyPolicyCommand({
              KeyId: describeKeyCommandOutput.KeyMetadata?.KeyId,
              PolicyName: "default",
              Policy: keyPolicyTemplateStringReplaced,
              BypassPolicyLockoutSafetyCheck: false,
            })
          );
          println(
            `${awsAccountIdAndRegionStringWidhPad}  ->  ${ac.green("UPDATED")}`
          );
        }
      }
    } else {
      println(`${awsAccountIdAndRegionStringWidhPad}  ->  SKIP`);
    }
  };
}
