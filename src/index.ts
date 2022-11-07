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
    console.log(awsAccountId, accountAliasName);
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
    const args = yargs
      .options({
        "config-file": {
          describe: "config file path",
          alias: "c",
          type: "string",
          require: true,
        },
      })
      .parseSync();

    // 設定ファイルを読み込み
    const awsGovBaseConfig = yaml.load(
      readFileSync(args["config-file"], "utf-8")
    ) as AwsGovBaseConfig;

    // 定数クラスを生成
    C.init({ awsGovBaseConfig: awsGovBaseConfig });

    const BASE_REGION = awsGovBaseConfig.General.BaseRegion;
    const PROFILES = awsGovBaseConfig.General.Profiles;
    const STRUCTURE = awsGovBaseConfig.Structure;

    // console.log(args["config-file"]);
    // console.log(BASE_REGION);
    // console.log(PROFILES);

    // console.log(yaml.dump(config));

    // 全AWSアカウントのエイリアスを出力
    // await printAllAwsAccountAlias(PROFILES, BASE_REGION);
    // console.log("bye");

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
    await dep.deploy({
      stackName: `${awsGovBaseConfig.General.AppName}---${templateName}`,
      templateName: templateName,
      templateFilePath: `${__dirname}/../cfn/test/test.yaml`,
      parameters: parameters,
      tags: tags,
    });

    // await dep(awsGovBaseConfig);
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  await main();
})();
