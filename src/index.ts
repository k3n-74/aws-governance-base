import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { IAMClient, ListAccountAliasesCommand } from "@aws-sdk/client-iam";
import * as cfn from "@aws-sdk/client-cloudformation";
import { CredentialProvider } from "@aws-sdk/types";
import { Deployer } from "./aws/cfn/deployer";
import { getSsoCredential } from "./credential-provider";
import { Consts as C, AwsGovBaseConfig, CommandOptions } from "./consts";
import { exit, stderr } from "process";
import { Console } from "console";
import { print, println } from "./util";
import { logger } from "./logger";
import { FooFeature } from "./feature/foo";
import { JumpFeature } from "./feature/jump";
import { GuardDutyFeature } from "./feature/guard-duty";
import { AccountPasswordPolicyFeature } from "./feature/account-password-policy";
import { IamAccessAnalyzerFeature } from "./feature/iam-access-analyzer";
import { SecurityAlartNotificationFeature } from "./feature/security-alart-notification";
import { DetectiveFeature } from "./feature/detective";

const getAwsAccountAlias = async (
  credential: CredentialProvider,
  region: string
): Promise<string | undefined> => {
  const iamClient = new IAMClient({
    credentials: credential,
    region: region,
  });

  const data = await iamClient.send(
    new ListAccountAliasesCommand({ MaxItems: 1 })
  );
  return data.AccountAliases?.[0];
};

const printAllAwsAccountAlias = async (
  profiles: AwsGovBaseConfig["General"]["Profiles"],
  baseRegion: AwsGovBaseConfig["General"]["BaseRegion"]
) => {
  // 全AWSアカウントのエイリアスを出力
  for (const awsAccountId of Object.keys(profiles)) {
    const credential = await getSsoCredential(awsAccountId);
    const accountAliasName = await getAwsAccountAlias(credential, baseRegion);
    logger.debug(awsAccountId, accountAliasName);
  }
};

const main = async () => {
  try {
    const args = yargs
      .command({
        command: "setup",
        describe: "",
        builder: {
          "config-file": {
            describe: "config file path",
            alias: "c",
            type: "string",
            require: true,
          },
          feature: {
            describe: "この機能だけセットアップする",
            type: "string",
            require: false,
          },
          "aws-account-id": {
            describe: "このAWSアカウントだけセットアップする",
            type: "string",
            require: false,
          },
          region: {
            describe: "このリージョンだけセットアップする",
            type: "string",
            require: false,
          },
          debug: {
            describe: "デバッグモード",
            type: "boolean",
            require: false,
            default: false,
          },
        },
        handler: (argv) => {},
      })
      // .command({
      //   command: "dest",
      //   describe: "",
      //   builder: {
      //     force: {
      //       describe: "config file path",
      //       alias: "c",
      //       type: "boolean",
      //     },
      //   },
      //   handler: (argv) => {},
      // })
      .parseSync();

    logger.debug(args);

    if (!(args._.length == 1 && args._[0] == "setup")) {
      println("setupコマンドを指定してください");
      exit(1);
    }

    const feature: string | undefined = args["feature"]
      ? (args["feature"] as string)
      : undefined;

    const awsAccountId: string | undefined = args["aws-account-id"]
      ? (args["aws-account-id"] as string)
      : undefined;

    const region: string | undefined = args["region"]
      ? (args["region"] as string)
      : undefined;

    const isDebug: boolean = args["debug"] as boolean;
    if (isDebug) {
      logger.level = "DEBUG";
    }

    logger.debug("hello");

    // exit(0);

    // 設定ファイルを読み込み
    const filePath = args["config-file"] as string;
    const awsGovBaseConfig = yaml.load(
      readFileSync(filePath, "utf-8")
      // readFileSync("test", "utf-8")
    ) as AwsGovBaseConfig;

    // 定数クラスを生成
    C.init({
      awsGovBaseConfig: awsGovBaseConfig,
      commandOptions: {
        feature: feature,
        awsAccountId: awsAccountId,
        region: region,
      },
    });

    // 全AWSアカウントのエイリアスを出力
    // await printAllAwsAccountAlias(PROFILES, BASE_REGION);
    // logger.debug("bye");

    // 開発用の feature
    const fooFeature = new FooFeature();
    await fooFeature.setup();

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
  } catch (e) {
    logger.error(e);
    println((e as Error).message);
  }
};

(async () => {
  await main();
})();
