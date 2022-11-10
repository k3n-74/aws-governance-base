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
  print("feature: " + featureName + "  ");
  if (
    C.i.commandOptions.feature == undefined ||
    C.i.commandOptions.feature == featureName
  ) {
    println("");
    return true;
  } else {
    println("skip");
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
    println(awsAccountId + "  skip");
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
    print(region + "  skip");
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
export const deploy = async (
  deployFuncInput: DeployFuncInput
): Promise<void> => {
  if (
    isSetupTargetAwsAccount(deployFuncInput.awsAccountId) &&
    isSetupTargetRegion(deployFuncInput.region)
  ) {
    // セットアップ対象のAWSアカウント&リージョンだったらセットアップ
    // println(`${deployFuncInput.awsAccountId}  ${deployFuncInput.region}`);
    const credential = await getSsoCredential(deployFuncInput.awsAccountId);
    const dep = await Deployer.createInstance({
      credential,
      region: deployFuncInput.region,
    });

    for (const stack of deployFuncInput.stacks) {
      const stackName = `${C.i.general.AppName}---${stack.templateName}`;
      const awsAccountIdAndRegionString =
        `${deployFuncInput.awsAccountId}  ${deployFuncInput.region}`.padEnd(
          28,
          " "
        );
      println(`${awsAccountIdAndRegionString}  ${stackName}  START DEPLOY`);
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
      println(
        `${awsAccountIdAndRegionString}  ${stackName}  ${deployResult.deployResult}`
      );
    }
  } else {
    println(
      `${deployFuncInput.awsAccountId}  ${deployFuncInput.region}  ->  スキップ`
    );
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
