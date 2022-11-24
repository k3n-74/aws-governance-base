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
import { EnableImageDeprecationRequestFilterSensitiveLog } from "@aws-sdk/client-ec2";

export class ConfigRuleFeature {
  private readonly featureNameList = ["config-rule"];

  private readonly YES = "YES";
  private readonly NO = "NO";

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

    // https://docs.aws.amazon.com/config/latest/developerguide/cloudwatch-log-group-encrypted.html
    const UNSUPPORTED_REGION_CLOUDWATCH_LOG_GROUP_ENCRYPTED = [
      "cn-north-1", //Beijing
      "ap-southeast-3", //Jakarta
      "me-central-1", //UAE
      "ap-northeast-3", //Osaka
      "eu-south-2", //Spain
      "cn-northwest-1", //Ningxia
      "eu-central-2", //Zurich
    ];

    // https://docs.aws.amazon.com/config/latest/developerguide/s3-default-encryption-kms.html
    const UNSUPPORTED_REGION_S3_DEFAULT_ENCRYPTION_KMS = [
      "ap-southeast-3", //Jakarta
      "me-central-1", //UAE
      "ap-northeast-3", //Osaka
      "eu-south-2", //Spain
      "eu-central-2", //Zurich
    ];

    // 全AWSアカウントにスタックをデプロイ
    for (const awsAccountId of allAwsAccountIds) {
      // TODO: listAvailableRegions関数の実行要否について、デプロイ対象のAWSアカウント、リージョンなのかを確認する機能を追加する
      const availableRegions = await listAvailableRegions(awsAccountId);

      // const templateNamePrefix = "config-rule--";

      // 全リージョン分の引数のリストを作成する
      const deployFuncInputList: DeployFuncInput[] = [];

      for (const region of availableRegions) {
        // CLOUDWATCH_LOG_GROUP_ENCRYPTED のサポート対象リージョンかを確認
        const enableCloudwatchLogGroupEncrypted =
          UNSUPPORTED_REGION_CLOUDWATCH_LOG_GROUP_ENCRYPTED.includes(region)
            ? this.NO
            : this.YES;

        // S3_DEFAULT_ENCRYPTION_KMS のサポート対象リージョンかを確認
        const enableS3DefaultEncryptionKms =
          UNSUPPORTED_REGION_S3_DEFAULT_ENCRYPTION_KMS.includes(region)
            ? this.NO
            : this.YES;

        if (
          // 今のところ全リージョン対応のルールが無いので、全部のルールがNOだったらデプロイしない
          enableCloudwatchLogGroupEncrypted == this.YES ||
          enableS3DefaultEncryptionKms == this.YES
        ) {
          deployFuncInputList.push({
            awsAccountId: awsAccountId,
            region: region,
            stacks: [
              {
                templateName: "config-rule",
                templateFilePath: `${__dirname}/../../cfn/config-rule/config-rule.yaml`,
                parameters: [
                  {
                    ParameterKey: "CmkAliasName",
                    ParameterValue: C.i.general.CmkAliasName,
                  },
                  {
                    ParameterKey: "EnableCloudwatchLogGroupEncrypted",
                    ParameterValue: enableCloudwatchLogGroupEncrypted,
                  },
                  {
                    ParameterKey: "EnableS3DefaultEncryptionKms",
                    ParameterValue: enableS3DefaultEncryptionKms,
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
