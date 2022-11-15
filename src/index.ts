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
import { SetupCommand } from "./command/setup";
import { BatchPutKmsKeyPolicyCommand } from "./command/batch-put-kms-key-policy";

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
      .command({
        command: "batch-put-kms-key-policy",
        describe: "",
        builder: {
          "config-file": {
            describe: "config file path",
            alias: "c",
            type: "string",
            require: true,
          },
          "key-policy-file": {
            describe: "kms key policy file path",
            type: "string",
            require: true,
          },
          "key-alias-name": {
            describe:
              "This value must begin with alias/ followed by a name, such as alias/ExampleAlias.",
            type: "string",
            require: true,
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
          "dry-run": {
            describe:
              "Key Policyのアップデートは実行せず、アップデートをするかどうかを出力する。",
            type: "boolean",
            require: false,
            default: false,
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
      .parseSync();

    if (!(args._.length == 1)) {
      println("コマンドを１つ指定してください");
      exit(1);
    }

    const command: string = args._[0] as string;

    const isDebug: boolean = args["debug"] as boolean;
    if (isDebug) {
      logger.level = "DEBUG";
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

    const keyPolicyFile: string | undefined = args["key-policy-file"]
      ? (args["key-policy-file"] as string)
      : undefined;

    const keyAliasName: string | undefined = args["key-alias-name"]
      ? (args["key-alias-name"] as string)
      : undefined;

    const isDryRun: boolean = args["dry-run"] as boolean;

    logger.debug(args);

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
        keyPolicyFile: keyPolicyFile,
        keyAliasName: keyAliasName,
        isDryRun: isDryRun,
      },
    });

    // 全AWSアカウントのエイリアスを出力
    // await printAllAwsAccountAlias(PROFILES, BASE_REGION);
    // logger.debug("bye");

    if (command == "setup") {
      const setupCommand = new SetupCommand();
      await setupCommand.runCommand();
    } else if (command == "batch-put-kms-key-policy") {
      const batchPutKmsKeyPolicyCommand = new BatchPutKmsKeyPolicyCommand();
      await batchPutKmsKeyPolicyCommand.runCommand();
    } else {
      println("不明なコマンドです。");
      exit(1);
    }
  } catch (e) {
    logger.error(e);
    println((e as Error).message);
  }
};

(async () => {
  await main();
})();
