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

export class JumpFeature {
  private readonly featureName = "jump";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;

    // Jump
    await deploy({
      awsAccountId: C.i.structure.Jump.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "permissions-boundary",
          templateFilePath: `${__dirname}/../../cfn/jump/permissions-boundary.yaml`,
        },
        {
          templateName: "switch-role-users-group",
          templateFilePath: `${__dirname}/../../cfn/jump/switch-role-users-group.yaml`,
        },
        {
          templateName: "switch-role-target-role-for-jump",
          templateFilePath: `${__dirname}/../../cfn/jump/switch-role-target-role-for-jump.yaml`,
          parameters: [
            {
              ParameterKey: "JumpAwsAccountId",
              ParameterValue: C.i.structure.Jump.id,
            },
          ],
        },
      ],
    });

    // Audit
    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "permissions-boundary",
          templateFilePath: `${__dirname}/../../cfn/jump/permissions-boundary.yaml`,
        },
        {
          templateName: "switch-role-target-role-for-audit",
          templateFilePath: `${__dirname}/../../cfn/jump/switch-role-target-role-for-audit.yaml`,
          parameters: [
            {
              ParameterKey: "JumpAwsAccountId",
              ParameterValue: C.i.structure.Jump.id,
            },
          ],
        },
      ],
    });

    // Guest
    for (const awsAccount of C.i.structure.Guests) {
      await deploy({
        awsAccountId: awsAccount.id,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "permissions-boundary",
            templateFilePath: `${__dirname}/../../cfn/jump/permissions-boundary.yaml`,
          },
          {
            templateName: "switch-role-target-role-for-guest",
            templateFilePath: `${__dirname}/../../cfn/jump/switch-role-target-role-for-guest.yaml`,
            parameters: [
              {
                ParameterKey: "JumpAwsAccountId",
                ParameterValue: C.i.structure.Jump.id,
              },
            ],
          },
        ],
      });
    }
  };
}
