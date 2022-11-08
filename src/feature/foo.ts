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

export class FooFeature {
  private readonly featureName = "foo";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;
    // このスタックだけ特別にfeatureで指定された時だけデプロイ
    if (C.i.commandOptions.feature != this.featureName) {
      println("feature: foo  skip");
      println(
        "feature: foo は --feature オプションで明示的に指定されたときのみデプロイできます。"
      );
      return;
    }

    for (const awsAccount of C.i.structure.Guests) {
      await deploy({
        awsAccountId: awsAccount.id,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "foo",
            templateFilePath: `${__dirname}/../../cfn/foo/foo.yaml`,
          },
        ],
      });
    }
  };
}
