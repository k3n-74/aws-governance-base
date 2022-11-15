import { Consts as C, AwsGovBaseConfig } from "./consts";
import { Deployer } from "./aws/cfn/deployer";
import { CredentialProvider } from "@aws-sdk/types";
import { getSsoCredential } from "./credential-provider";
import { logger } from "./logger";
import { CFNRegistryException } from "@aws-sdk/client-cloudformation";
import * as cfn from "@aws-sdk/client-cloudformation";
import * as ec2 from "@aws-sdk/client-ec2";
import { string } from "yargs";
import { Region } from "@aws-sdk/client-ec2";
import ac from "ansi-colors";

// export const write = (str: string, newLine: boolean = true) => {
//   if (str === undefined) {
//     str = "undefined";
//   } else if (str === null) {
//     str = "null";
//   }
//   str = newLine ? str + "\n" : str;
//   process.stdout.write(str);
// };

export const print = (str: string) => {
  if (str === undefined) {
    str = "undefined";
  } else if (str === null) {
    str = "null";
  }
  process.stdout.write(str);
};

export const println = (str: string) => {
  if (str === undefined) {
    str = "undefined";
  } else if (str === null) {
    str = "null";
  }
  str = str + "\n";
  process.stdout.write(str);
};

export const isSetupTargetFeature = (featureName: string): boolean => {
  const featureWithPad = `feature: ${featureName}`.padEnd(32, " ");
  if (
    // Detectiveだけは単体セットアップのみ可能にする。
    // DetectiveはGuardDutyを有効化してから48時間以上経過した後で
    // セットアップ可能であり、他とセットアップタイミングが異なるため。
    (C.i.commandOptions.feature == undefined && featureName != "detective") ||
    C.i.commandOptions.feature == featureName
  ) {
    println(`${featureWithPad}  start deploy`);
    return true;
  } else {
    println(`${featureWithPad}  skip`);
    return false;
  }
};

export const isSetupTargetAwsAccount = (awsAccountId: string): boolean => {
  if (
    C.i.commandOptions.awsAccountId == undefined ||
    C.i.commandOptions.awsAccountId == awsAccountId
  ) {
    return true;
  } else {
    // println(awsAccountId + "  skip");
    return false;
  }
};

export const isSetupTargetRegion = (region: string): boolean => {
  if (
    C.i.commandOptions.region == undefined ||
    C.i.commandOptions.region == region
  ) {
    return true;
  } else {
    // println(region + "  skip");
    return false;
  }
};

export type Stack = {
  templateName: string;
  templateFilePath: string;
  parameters?: cfn.Parameter[];
};
export type DeployFuncInput = {
  awsAccountId: string;
  region: string;
  stacks: Stack[];
};

export const createAwsAccountIdAndRegionStringWithPad = (args: {
  awsAccountId: string;
  region: string;
}): string => {
  return `${args.awsAccountId}  ${args.region}`.padEnd(32, " ");
};

export const deploy = async (
  deployFuncInput: DeployFuncInput
): Promise<void> => {
  const awsAccountIdAndRegionStringWidhPad =
    createAwsAccountIdAndRegionStringWithPad({
      awsAccountId: deployFuncInput.awsAccountId,
      region: deployFuncInput.region,
    });
  if (
    isSetupTargetAwsAccount(deployFuncInput.awsAccountId) &&
    isSetupTargetRegion(deployFuncInput.region)
  ) {
    // セットアップ対象のAWSアカウント&リージョンだったらセットアップ
    // println(`${deployFuncInput.awsAccountId}  ${deployFuncInput.region}`);
    const credential = await getSsoCredential(deployFuncInput.awsAccountId);
    // const cred = await credential();
    // logger.debug(cred.accessKeyId);
    // logger.debug(cred.secretAccessKey);
    // logger.debug(cred.sessionToken);
    // logger.debug(cred.expiration);
    const dep = await Deployer.createInstance({
      credential,
      region: deployFuncInput.region,
    });

    for (const stack of deployFuncInput.stacks) {
      const stackName = `${C.i.general.AppName}---${stack.templateName}`;
      println(
        `${awsAccountIdAndRegionStringWidhPad}  ${stackName}  START DEPLOY`
      );
      // stack.parametersが指定されたらデフォルトのparametersと合成する
      const parameters = stack.parameters
        ? stack.parameters.concat(C.i.parameters)
        : C.i.parameters;
      logger.debug(parameters);
      const deployResult = await dep.deploy({
        stackName: stackName,
        templateName: stack.templateName,
        templateFilePath: stack.templateFilePath,
        parameters: parameters,
        tags: C.i.tags,
      });

      let deployType = "";
      if (deployResult.deployResult == "EMPTY CHANGESET") {
        deployType = ac.yellow("EMPTY CHANGESET");
      } else if (deployResult.deployResult == "CREATE") {
        deployType = ac.blue("CREATE");
      } else if (deployResult.deployResult == "UPDATE") {
        deployType = ac.green("UPDATE");
      } else {
        deployType = deployResult.deployResult;
        logger.error(ac.red(`Unknown CHANGE SET TYPE : ${deployType}`));
      }
      println(
        `${awsAccountIdAndRegionStringWidhPad}  ${stackName}  ${deployResult.deployResult}`
      );
    }
  } else {
    println(`${awsAccountIdAndRegionStringWidhPad}  ->  SKIP`);
  }
};

export const listAvailableRegions = async (
  awsAccountId: string
): Promise<string[]> => {
  const credential = await getSsoCredential(awsAccountId);
  const ec2Client = new ec2.EC2Client({
    credentials: credential,
    region: C.i.general.BaseRegion,
  });

  const res = await ec2Client.send(
    new ec2.DescribeRegionsCommand({
      AllRegions: true,
      Filters: [
        { Name: "opt-in-status", Values: ["opt-in-not-required", "opted-in"] },
      ],
    })
  );

  let availableRegions: string[] = [];

  if (res.Regions !== undefined) {
    for (const region of res.Regions) {
      if (region.RegionName !== undefined) {
        availableRegions.push(region.RegionName);
      }
    }
  } else {
  }

  logger.debug(awsAccountId);
  logger.debug(availableRegions);
  return availableRegions;
};
