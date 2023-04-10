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

export class EventAggregationFeature {
  private readonly featureNameList = ["event-aggregation"];

  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureNameList)) return;

    // Auditアカウント以外のリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const awsAccountIdsExceptAudit: string[] = C.i.structure.Guests.map(
      (account) => {
        return account.id;
      }
    );
    // Jumpアカウントを追加する
    awsAccountIdsExceptAudit.push(C.i.structure.Jump.id);

    // 全AWSアカウントのリストを作成する( concat()をコピーを作るために利用している )
    const allAwsAccountIds = awsAccountIdsExceptAudit.concat([
      C.i.structure.Audit.id,
    ]);

    // Audit アカウントにイベントバスを作成
    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "event-aggregation--event-bus",
          templateFilePath: `${__dirname}/../../cfn/event-aggregation/event-aggregation--event-bus.yaml`,
          parameters: [
            {
              ParameterKey: "AllAwsAccountIds",
              ParameterValue: allAwsAccountIds.join(", "),
            },
            {
              ParameterKey: "CmkAliasName",
              ParameterValue: C.i.general.CmkAliasName,
            },
          ],
        },
      ],
    });

    // 全AWSアカウントのベースリージョンにマスターイベントバスにイベント送信するためのロールを作成
    for (const awsAccountId of allAwsAccountIds) {
      // Audit
      await deploy({
        awsAccountId: awsAccountId,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "event-aggregation--send-event-to-master-role",
            templateFilePath: `${__dirname}/../../cfn/event-aggregation/event-aggregation--send-event-to-master-role.yaml`,
            parameters: [
              {
                ParameterKey: "AuditAwsAccountId",
                ParameterValue: C.i.structure.Audit.id,
              },
            ],
          },
        ],
      });
    }

    // 全AWSアカウントの全リージョンにイベント集約のルールを作成
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
              templateName: "event-aggregation--send-event-to-master-rule",
              templateFilePath: `${__dirname}/../../cfn/event-aggregation/event-aggregation--send-event-to-master-rule.yaml`,
              parameters: [
                {
                  ParameterKey: "BaseRegion",
                  ParameterValue: C.i.general.BaseRegion,
                },
                {
                  ParameterKey: "AuditAwsAccountId",
                  ParameterValue: C.i.structure.Audit.id,
                },
              ],
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
