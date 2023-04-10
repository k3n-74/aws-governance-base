import { CredentialProvider } from "@aws-sdk/types";
import { Consts as C, AwsGovBaseConfig } from "../consts";
import { getSsoCredential } from "../credential-provider";
import {
  print,
  println,
  isSetupTargetFeature,
  isSetupTargetAwsAccount,
  isSetupTargetRegion,
  deploy,
  DeployFuncInput,
  listAvailableRegions,
} from "../util";
import * as throat from "throat";
import { logger } from "../logger";

export class IamAccessAnalyzerFeature {
  private readonly featureNameList = ["iam-access-analyzer"];
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureNameList)) return;

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
      const deployFuncInputList: DeployFuncInput[] = [];
      for (const region of availableRegions) {
        deployFuncInputList.push({
          awsAccountId: awsAccountId,
          region: region,
          stacks: [
            {
              templateName: "iam-access-analyzer",
              templateFilePath: `${__dirname}/../../cfn/iam-access-analyzer/iam-access-analyzer.yaml`,
            },
          ],
        });
      }
      // 最大9並列の範囲内で全リージョンに対して一斉にdeployを実行
      const res = await Promise.all(
        deployFuncInputList.map(
          throat.default(9, (deployFuncInput) => {
            return deploy(deployFuncInput);
          })
        )
      );
    }
  };
}
