import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { IAMClient, ListAccountAliasesCommand } from "@aws-sdk/client-iam";
import * as cfn from "@aws-sdk/client-cloudformation";
import { CredentialProvider } from "@aws-sdk/types";
import { AwsGovBaseConfig } from "./aws-gov-base-config";
import { Deployer } from "./deployer";
import { getSsoCredential } from "./credential-provider";

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
    const credential = await getSsoCredential(awsAccountId, profiles);
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

    const awsGovBaseConfig = yaml.load(
      readFileSync(args["config-file"], "utf-8")
    ) as AwsGovBaseConfig;

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
    const dep = await Deployer.createInstance({
      awsAccountId: awsGovBaseConfig.Structure.Guests[0].id,
      awsGovBaseConfig: awsGovBaseConfig,
      region: awsGovBaseConfig.General.BaseRegion,
    });
    // await dep.deploy("logs", `${__dirname}/../cfn/test/test.yaml`);
    await dep.deploy({
      templateName: "logs",
      templateFilePath: `${__dirname}/../cfn/test/test.yaml`,
    });

    // await dep(awsGovBaseConfig);
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  await main();
})();
