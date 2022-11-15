import { Consts as C, AwsGovBaseConfig } from "../consts";
import { FooFeature } from "../feature/foo";
import { JumpFeature } from "../feature/jump";
import { GuardDutyFeature } from "../feature/guard-duty";
import { AccountPasswordPolicyFeature } from "../feature/account-password-policy";
import { IamAccessAnalyzerFeature } from "../feature/iam-access-analyzer";
import { SecurityAlartNotificationFeature } from "../feature/security-alart-notification";
import { DetectiveFeature } from "../feature/detective";
import { CommonFeature } from "../feature/common";
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
import { logger } from "../logger";

export class SetupCommand {
  public runCommand = async (): Promise<void> => {
    // 開発用の feature
    const fooFeature = new FooFeature();
    await fooFeature.setup();

    // Account Password Policy
    const commonFeature = new CommonFeature();
    await commonFeature.setup();

    // Account Password Policy
    const accountPasswordPolicy = new AccountPasswordPolicyFeature();
    await accountPasswordPolicy.setup();

    // Jump
    const jumpFeature = new JumpFeature();
    await jumpFeature.setup();

    // Guard Duty
    const guardDuty = new GuardDutyFeature();
    await guardDuty.setup();

    // IAM Access Analyzer
    const iamAccessAnalyzer = new IamAccessAnalyzerFeature();
    await iamAccessAnalyzer.setup();

    // Security Alart Notification
    const securityAlartNotificationFeature =
      new SecurityAlartNotificationFeature();
    await securityAlartNotificationFeature.setup();
    // Detective
    // GuardDutyをデプロイしてから48時間時間後
    const detective = new DetectiveFeature();
    await detective.setup();
  };
}
