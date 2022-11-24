import { Consts as C, AwsGovBaseConfig } from "../consts";
import { FooFeature } from "../feature/foo";
import { JumpFeature } from "../feature/jump";
import { GuardDutyFeature } from "../feature/guard-duty";
import { AccountPasswordPolicyFeature } from "../feature/account-password-policy";
import { IamAccessAnalyzerFeature } from "../feature/iam-access-analyzer";
import { EventNotificationFeature } from "../feature/event-notification";
import { EventAggregationFeature } from "../feature/event-aggregation";
import { DetectiveFeature } from "../feature/detective";
import { CommonFeature } from "../feature/common";
import { DevOpsGuruFeature } from "../feature/devops-guru";
import { ConfigRuleFeature } from "../feature/config-rule";
import { AutoRemediationFeature } from "../feature/auto-remediation";
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

    // Event Notification
    const eventNotificationFeature = new EventNotificationFeature();
    await eventNotificationFeature.setup();

    // Event Aggregation
    const eventAggregationFeature = new EventAggregationFeature();
    await eventAggregationFeature.setup();

    // DevOps Guru
    const devOpsGuruFeature = new DevOpsGuruFeature();
    await devOpsGuruFeature.setup();

    // Config Rule
    const configRuleFeature = new ConfigRuleFeature();
    await configRuleFeature.setup();

    // Auto Remediation
    const autoRemediationFeature = new AutoRemediationFeature();
    await autoRemediationFeature.setup();

    // Detective
    // GuardDutyをデプロイしてから48時間時間後
    const detective = new DetectiveFeature();
    await detective.setup();
  };
}
