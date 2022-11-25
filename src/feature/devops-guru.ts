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

export class DevOpsGuruFeature {
  private readonly featureNameList = ["devops-guru"];
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

    // https://www.aws-services.info/devops-guru.html
    // https://aws.amazon.com/devops-guru/faqs/
    const SUPPORTED_REGIONS_DEVOPS_GURU = [
      "ap-northeast-1", //Tokyo
      "ap-northeast-2", //Seoul
      "ap-south-1", //Mumbai
      "ap-southeast-1", //Singapore
      "ap-southeast-2", //Sydney
      "ca-central-1", //Central
      "eu-central-1", //Frankfurt
      "eu-north-1", //Stockholm
      "eu-west-1", //Ireland
      "eu-west-2", //London
      "eu-west-3", //Paris
      "sa-east-1", //Sao Paulo
      "us-east-1", //N. Virginia
      "us-east-2", //Ohio
      "us-west-1", //N. California
      "us-west-2", //Oregon
    ];

    // 全AWSアカウントにスタックをデプロイ
    for (const awsAccountId of allAwsAccountIds) {
      // TODO: listAvailableRegions関数の実行要否について、デプロイ対象のAWSアカウント、リージョンなのかを確認する機能を追加する
      const availableRegions = await listAvailableRegions(awsAccountId);

      // 全リージョン分の引数のリストを作成する
      const deployFuncInputList: DeployFuncInput[] = [];
      for (const region of availableRegions) {
        // サポート対象のリージョンにのみデプロイする
        if (SUPPORTED_REGIONS_DEVOPS_GURU.includes(region)) {
          deployFuncInputList.push({
            awsAccountId: awsAccountId,
            region: region,
            stacks: [
              {
                templateName: "devops-guru",
                templateFilePath: `${__dirname}/../../cfn/devops-guru/devops-guru.yaml`,
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
