import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { IAMClient, ListAccountAliasesCommand } from "@aws-sdk/client-iam";
import { CredentialProvider } from "@aws-sdk/types";

type AwsGovBaseConfig = {
  General: {
    BaseRegion: string;
    Profiles: Record<string, string>;
  };
  Structure: {
    Jump: {
      id: string;
    };
    Audit: {
      id: string;
    };
    Guests: [{ id: string }];
  };
};

const getSsoCredential = async (
  awsAccountId: string,
  profiles: AwsGovBaseConfig["General"]["Profiles"]
): Promise<CredentialProvider> => {
  const profileName = profiles[awsAccountId];
  if (profileName == null) throw Error("profile name is undefined.");
  return fromSSO({ profile: profileName });
};

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

    console.log(args["config-file"]);
    console.log(BASE_REGION);
    console.log(PROFILES);

    // console.log(yaml.dump(config));

    // 全AWSアカウントのエイリアスを出力
    await printAllAwsAccountAlias(PROFILES, BASE_REGION);
    console.log("bye");
    // // Jump
    // await setupJump(PROFILES, BASE_REGION, STRUCTURE);
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  await main();
})();