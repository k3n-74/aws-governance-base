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
import * as iam from "@aws-sdk/client-iam";

export class AccountPasswordPolicyFeature {
  private readonly featureName = "account-password-policy";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;

    // 全AWSアカウントのリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const allAwsAccountIds: string[] = C.i.structure.Guests.map((account) => {
      return account.id;
    });
    allAwsAccountIds.push(C.i.structure.Jump.id);
    allAwsAccountIds.push(C.i.structure.Audit.id);

    // All AWS Account
    for (const awsAccountId of allAwsAccountIds) {
      if (isSetupTargetAwsAccount(awsAccountId)) {
        const credential = await getSsoCredential(awsAccountId);
        const iamClient = new iam.IAMClient({
          credentials: credential,
          region: C.i.general.BaseRegion,
        });

        const res = await iamClient.send(
          new iam.UpdateAccountPasswordPolicyCommand({
            MinimumPasswordLength: 12,
            RequireSymbols: true,
            RequireNumbers: true,
            RequireUppercaseCharacters: true,
            RequireLowercaseCharacters: true,
            AllowUsersToChangePassword: true,
            // ExpirePasswords: false,
            MaxPasswordAge: undefined,
            PasswordReusePrevention: undefined,
            HardExpiry: undefined,
          })
        );

        logger.debug("iam.UpdateAccountPasswordPolicyCommand: ", res);
      }
    }
  };
}
