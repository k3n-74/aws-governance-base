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

export const isSetupTargetFeature = (featureNameList: string[]): boolean => {
  if (
    // Detectiveだけは単体セットアップのみ可能にする。
    // DetectiveはGuardDutyを有効化してから48時間以上経過した後で
    // セットアップ可能であり、他とセットアップタイミングが異なるため。
    (C.i.commandOptions.feature == undefined &&
      !featureNameList.includes("detective")) ||
    (C.i.commandOptions.feature != undefined &&
      featureNameList.includes(C.i.commandOptions.feature))
  ) {
    // デプロイするときに表示する feature名 の決め方。
    // --featureオプションで指定されてデプロイするときは、そのオプションで指定された値。
    // --featureオプションで指定されていないときは代表フィーチャー名（featureの先頭配列）
    const deployFeature = C.i.commandOptions.feature ?? featureNameList[0];
    const featureWithPad = `feature: ${deployFeature}`.padEnd(32, " ");
    println(`${featureWithPad}  start deploy`);
    return true;
  } else {
    // デプロイしない時に表示する feature名 は代表フィーチャー名（featureの先頭配列）
    const featureWithPad = `feature: ${featureNameList[0]}`.padEnd(32, " ");
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

export type ReplaceInfo = {
  subStr: string;
  newStr: string;
};

export type Stack = {
  templateName: string;
  templateFilePath: string;
  parameters?: cfn.Parameter[];
  replaceTemplateContent?: ReplaceInfo[];
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

export const getCfnStackParameter = async (
  awsAccountId: string,
  region: string,
  stackName: string,
  parameterKey: string
): Promise<string> => {
  const credentials = await getSsoCredential(awsAccountId);
  const cfnClient = new cfn.CloudFormationClient({
    credentials: credentials,
    region: region,
  });

  const describeStacksCommandOutput = await cfnClient.send(
    new cfn.DescribeStacksCommand({
      StackName: stackName,
    })
  );

  let parameterValue = undefined;

  for (const param of describeStacksCommandOutput.Stacks?.[0].Parameters ??
    []) {
    if (param.ParameterKey == parameterKey)
      parameterValue = param.ParameterValue;
  }

  if (parameterValue == null) {
    throw new Error(`${parameterKey} key in ${stackName} stack is undefined.`);
  } else {
    return parameterValue;
  }
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

      try {
        const deployResult = await dep.deploy({
          stackName: stackName,
          templateName: stack.templateName,
          templateFilePath: stack.templateFilePath,
          replaceTemplateContent: stack.replaceTemplateContent,
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
          `${awsAccountIdAndRegionStringWidhPad}  ${stackName}  ${deployType}`
        );
      } catch (e) {
        logger.error(
          deployFuncInput.awsAccountId,
          deployFuncInput.region,
          stackName
        );
        logger.error(e);
        throw e;
      }
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

// 引数で受け取った２つの配列に重複した要素があるのかを確認する
export const hasDuplicateStringElement = (
  strListA: string[],
  strListB: string[]
) => {
  const elements = strListA.concat(strListB);
  const setElements = new Set(elements);
  return setElements.size !== elements.length;
};
