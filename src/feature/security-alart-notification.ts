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
} from "../util";
import { logger } from "../logger";

export class SecurityAlartNotificationFeature {
  private readonly featureName = "security-alart-notification";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;

    // Auditアカウント以外のリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const awsAccountIdsExceptAudit: string[] = C.i.structure.Guests.map(
      (account) => {
        return account.id;
      }
    );
    // Jumpアカウントを追加する
    awsAccountIdsExceptAudit.push(C.i.structure.Jump.id);

    // Auditアカウントにデプロイ
    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "security-alart-notificator",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator.yaml`,
          parameters: [
            {
              ParameterKey: "SecurityHubTeamsIncomingWebhookUrlDev",
              ParameterValue: C.i.securityHub.TeamsIncomingWebhookUrl.Dev,
            },
          ],
        },
        {
          templateName: "event-bus-target-guardduty-listener",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-target-guardduty-listener.yaml`,
        },
        {
          templateName: "event-bus-target",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-target.yaml`,
          parameters: [
            {
              ParameterKey: "SourceAwsAccountIds",
              ParameterValue: awsAccountIdsExceptAudit.join(", "),
            },
          ],
        },
      ],
    });

    // Auditアカウント以外にデプロイ
    for (const awsAccountId of awsAccountIdsExceptAudit) {
      // Audit
      await deploy({
        awsAccountId: awsAccountId,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "event-bus-source-guardduty-event",
            templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-source-guardduty-event.yaml`,
            parameters: [
              {
                ParameterKey: "TargetAwsAccountId",
                ParameterValue: C.i.structure.Audit.id,
              },
            ],
          },
        ],
      });
    }
  };
}
