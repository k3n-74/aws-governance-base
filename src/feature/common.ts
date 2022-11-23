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

export class CommonFeature {
  private readonly featureNameList = ["common"];
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureNameList)) return;

    // Auditアカウントのベースリージョンにのみデプロイ
    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "cfn-assets-storage",
          templateFilePath: `${__dirname}/../../cfn/common/cfn-assets-storage.yaml`,
        },
      ],
    });
  };
}
