import { Consts as C, AwsGovBaseConfig } from "../consts";
import {
  print,
  println,
  isSetupTargetFeature,
  isSetupTargetAwsAccount,
  isSetupTargetRegion,
  deploy,
  DeployFuncInput,
  Stack,
  listAvailableRegions,
} from "../util";
import * as throat from "throat";
import { logger } from "../logger";
import ac from "ansi-colors";

export class AutoRemediationFeature {
  private readonly featureNameList = ["auto-remediation"];

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

    // 全AWSアカウントにスタックをデプロイ
    for (const awsAccountId of allAwsAccountIds) {
      // TODO: listAvailableRegions関数の実行要否について、デプロイ対象のAWSアカウント、リージョンなのかを確認する機能を追加する
      const availableRegions = await listAvailableRegions(awsAccountId);

      const templateNamePrefix = "remediation--";

      // 全リージョン分の引数のリストを作成する
      const deployFuncInputList: DeployFuncInput[] = [];
      for (const region of availableRegions) {
        // 大阪リージョンはAWS Config ルールの修復アクション(AWS::Config::RemediationConfiguration)に
        // 非対応なのでデプロイ対象外にする
        // https://docs.aws.amazon.com/ja_jp/config/latest/developerguide/remediation.html#region-support-config-remediation
        if (region != "ap-northeast-3") {
          deployFuncInputList.push({
            awsAccountId: awsAccountId,
            region: region,
            stacks: [
              {
                templateName: `${templateNamePrefix}vpc-default-security-group-closed`,
                templateFilePath: `${__dirname}/../../cfn/auto-remediation/vpc-default-security-group-closed.yaml`,
                parameters: [
                  {
                    ParameterKey: "BaseRegion",
                    ParameterValue: C.i.general.BaseRegion,
                  },
                ],
              },
            ],
          });
        }
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
