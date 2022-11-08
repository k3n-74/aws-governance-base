import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { IAMClient, ListAccountAliasesCommand } from "@aws-sdk/client-iam";
import * as cfn from "@aws-sdk/client-cloudformation";
import { CredentialProvider } from "@aws-sdk/types";
import { Deployer } from "./aws/cfn/deployer";
import { getSsoCredential } from "./credential-provider";
import { Consts as C, AwsGovBaseConfig } from "./consts";
import { exit, stderr } from "process";
import { Console } from "console";
import { print, println } from "./util";
import { logger } from "./logger";

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

// const setupJump = async() => {
//   // JumpAccount をセットアップ
//   getSsoCredential();
//   setPasswordPolicy();
//   deployStack("xxx");
//   deployStack("yyy");
//   // Audit
//   getSsoCredential();
//   setPasswordPolicy();
//   deployStack("aaa");
//   deployStack("bbb");
//   // Guset
//   for( xxxx ){
//     getSsoCredential();
//     setPasswordPolicy();
//     deployStack("nnn");
//     deployStack("mmm");
//   }
// }

const main = async () => {
  try {
    // const args = yargs
    //   .options({
    //     "config-file": {
    //       describe: "config file path",
    //       alias: "c",
    //       type: "string",
    //       require: true,
    //     },
    //   })
    //   .parseSync();

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
            describe: "セットアップする機能",
            type: "string",
            require: false,
          },
          "aws-account": {
            describe: "セットアップするAWSアカウント",
            type: "string",
            require: false,
          },
          region: {
            describe: "セットアップするリージョン",
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

    // yargs.command("setup", "aaa").options({
    //   "config-file": {
    //     describe: "config file path",
    //     alias: "c",
    //     type: "string",
    //     require: true,
    //   },
    // });
    // yargs.command("dest", "aaa").options({
    //   "config-files": {
    //     describe: "config file path",
    //     alias: "c",
    //     type: "string",
    //     require: true,
    //   },
    // });

    // const args = yargs.parseSync();

    logger.debug(args);

    if (!(args._.length == 1 && args._[0] == "setup")) {
      println("setupコマンドを指定してください");
      exit(1);
    }

    const feature: string | undefined = args["feature"]
      ? (args["feature"] as string)
      : undefined;

    const awsAccount: string | undefined = args["aws-account"]
      ? (args["aws-account"] as string)
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
      feature: feature,
      awsAccount: awsAccount,
      region: region,
    });

    const BASE_REGION = awsGovBaseConfig.General.BaseRegion;
    const PROFILES = awsGovBaseConfig.General.Profiles;
    const STRUCTURE = awsGovBaseConfig.Structure;

    // 全AWSアカウントのエイリアスを出力
    // await printAllAwsAccountAlias(PROFILES, BASE_REGION);
    // logger.debug("bye");

    // // Jump
    // await setupJump(PROFILES, BASE_REGION, STRUCTURE);

    const credential = await getSsoCredential(
      awsGovBaseConfig.Structure.Guests[0].id
    );
    const dep = await Deployer.createInstance({
      credential,
      region: awsGovBaseConfig.General.BaseRegion,
    });

    const parameters: cfn.Parameter[] = [
      {
        ParameterKey: "AppName",
        ParameterValue: awsGovBaseConfig.General.AppName,
      },
    ];
    const tags: cfn.Tag[] = [
      { Key: "AppName", Value: awsGovBaseConfig.General.AppName },
    ];
    // await dep.deploy("logs", `${__dirname}/../cfn/test/test.yaml`);
    const templateName = "logs";
    const deployResult = await dep.deploy({
      stackName: `${awsGovBaseConfig.General.AppName}---${templateName}`,
      templateName: templateName,
      templateFilePath: `${__dirname}/../cfn/test/test.yaml`,
      parameters: parameters,
      tags: tags,
    });
    println(deployResult.deployResult);

    // await dep(awsGovBaseConfig);
  } catch (e) {
    logger.error(e);
  }
};

(async () => {
  await main();
})();
