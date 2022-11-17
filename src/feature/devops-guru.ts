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

export class DevOpsGuruFeature {
  private readonly featureName = "devops-guru";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;

    // Guest
    for (const awsAccount of C.i.structure.Guests) {
      await deploy({
        awsAccountId: awsAccount.id,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "devops-guru",
            templateFilePath: `${__dirname}/../../cfn/devops-guru/devops-guru.yaml`,
          },
        ],
      });
    }
  };
}
