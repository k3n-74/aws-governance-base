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
} from "../util";
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

    // Auditアカウントにスタックをデプロイ
    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "event-bus-target",
          templateFilePath: `${__dirname}/../../cfn/event-aggregation/event-bus-target.yaml`,
          parameters: [
            {
              ParameterKey: "SourceAwsAccountIds",
              ParameterValue: awsAccountIdsExceptAudit.join(", "),
            },
            {
              ParameterKey: "NotificationEventPatternSourceList",
              ParameterValue: C.i.notificationEventPatternSourceList.join(", "),
            },
            {
              ParameterKey: "CmkAliasName",
              ParameterValue: C.i.general.CmkAliasName,
            },
          ],
        },
      ],
    });

    // Auditアカウント以外にスタックをデプロイ
    for (const awsAccountId of awsAccountIdsExceptAudit) {
      // Audit
      await deploy({
        awsAccountId: awsAccountId,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "event-bus-source--send-event-to-target-account",
            templateFilePath: `${__dirname}/../../cfn/event-aggregation/event-bus-source--send-event-to-target-account.yaml`,
            parameters: [
              {
                ParameterKey: "TargetAwsAccountId",
                ParameterValue: C.i.structure.Audit.id,
              },
              {
                ParameterKey: "NotificationEventPatternSourceList",
                ParameterValue:
                  C.i.notificationEventPatternSourceList.join(", "),
              },
            ],
          },
        ],
      });
    }
  };
}
