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
      const templateNamePrefix = "remediation--";
      await deploy({
        awsAccountId: awsAccountId,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: `${templateNamePrefix}vpc-default-security-group-closed`,
            templateFilePath: `${__dirname}/../../cfn/auto-remediation/vpc-default-security-group-closed.yaml`,
          },
        ],
      });
    }
  };
}
