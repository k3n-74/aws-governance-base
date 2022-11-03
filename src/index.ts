import yargs from "yargs";
import * as yaml from "js-yaml";
import { readFileSync } from "fs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { IAMClient, ListAccountAliasesCommand } from "@aws-sdk/client-iam";

const getAccountAlias = async (
  profile: string,
  region: string
): Promise<string | undefined> => {
  const iamClient = new IAMClient({
    credentials: fromSSO({
      profile: profile,
    }),
    region: region,
  });

  const data = await iamClient.send(
    new ListAccountAliasesCommand({ MaxItems: 1 })
  );
  return data.AccountAliases?.[0];
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

    const config: any = yaml.load(readFileSync(args["config-file"], "utf-8"));

    const BASE_REGION = config["General"]["BaseRegion"];

    console.log(args["config-file"]);
    console.log(BASE_REGION);

    // console.log(yaml.dump(config));

    const profileList = config["General"]["Profiles"];
    console.log(profileList);
    for (const id of Object.keys(profileList)) {
      console.log(id, profileList[id]);
      const accountAliasName = await getAccountAlias(
        profileList[id],
        BASE_REGION
      );
      console.log(accountAliasName);
    }
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  await main();
})();
