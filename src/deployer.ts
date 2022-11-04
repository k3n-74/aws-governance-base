import * as cfn from "@aws-sdk/client-cloudformation";
import { AwsGovBaseConfig } from "./aws-gov-base-config";
import { getSsoCredential } from "./credential-provider";
import { CredentialProvider } from "@aws-sdk/types";
import { readFileSync, stat } from "fs";
import { WaiterConfiguration } from "@aws-sdk/types";

// AWS CLI の deploy コマンドの実装を参考に実装した
// https://github.com/aws/aws-cli/blob/develop/awscli/customizations/cloudformation/deploy.py
// https://github.com/aws/aws-cli/blob/develop/awscli/customizations/cloudformation/deployer.py

class ChangeEmptyError extends Error {
  constructor(stackName: string) {
    super(`[${stackName}] empty changeset.`);
  }
}

interface ChangesetInfo {
  changesetId: string;
  changesetType: string;
}

export class Deployer {
  private cfnClient: cfn.CloudFormationClient;
  private awsAccountId: string;
  private awsGovBaseConfig: AwsGovBaseConfig;
  private region: string;

  private readonly CHANGESET_PREFIX = "aws-governance-base-deploy-";

  private constructor(
    awsAccountId: string,
    awsGovBaseConfig: AwsGovBaseConfig,
    region: string,
    cfnClient: cfn.CloudFormationClient
  ) {
    this.awsAccountId = awsAccountId;
    this.awsGovBaseConfig = awsGovBaseConfig;
    this.region = region;
    this.cfnClient = cfnClient;
  }

  public static createInstance = async (
    awsAccountId: string,
    awsGovBaseConfig: AwsGovBaseConfig,
    region: string
  ): Promise<Deployer> => {
    const credential = await getSsoCredential(
      awsAccountId,
      awsGovBaseConfig.General.Profiles
    );
    const cfnClient = new cfn.CloudFormationClient({
      credentials: credential,
      region: awsGovBaseConfig.General.BaseRegion,
    });
    return new this(awsAccountId, awsGovBaseConfig, region, cfnClient);
  };

  public deploy = async (
    templateName: string,
    templateFilePath: string
  ): Promise<void> => {
    const stackName = `${this.awsGovBaseConfig.General.AppName}---${templateName}`;
    let changesetInfo: ChangesetInfo;
    try {
      changesetInfo = await this.createAndWaitForChangeset(
        stackName,
        templateFilePath
      );
    } catch (e) {
      if (e instanceof ChangeEmptyError) {
        // チェンジセットが空の時はエラーにしない
        // チェンジセットの実行をしないで正常終了
        console.log("empty changeset.");
        await this.updateTerminationProtection(stackName, true);
        return;
      } else {
        throw e;
      }
    }
    await this.executeChangeset(changesetInfo.changesetId, stackName);
    await this.waitForExecute(stackName, changesetInfo.changesetType);
    await this.updateTerminationProtection(stackName, true);
  };

  private createAndWaitForChangeset = async (
    stackName: string,
    templateFilePath: string
  ): Promise<ChangesetInfo> => {
    const ret = await this.createChangeset(stackName, templateFilePath);
    await this.waitForChangeset(ret.changesetId, stackName);
    return ret;
  };

  private createChangeset = async (
    stackName: string,
    templateFilePath: string
  ): Promise<ChangesetInfo> => {
    const changesetName = `${this.CHANGESET_PREFIX}${new Date().getTime()}`;
    let changesetType = undefined;
    const isHasStack = await this.hasStack(stackName);
    console.log("isHasStack:", isHasStack);

    if (!isHasStack) {
      changesetType = "CREATE";
    } else {
      changesetType = "UPDATE";
    }

    // CFnテンプレートファイルを読み込む
    const templateBody = readFileSync(templateFilePath, "utf-8");

    const createChangeSetCommandInput: cfn.CreateChangeSetCommandInput = {
      Capabilities: ["CAPABILITY_NAMED_IAM"],
      ChangeSetName: changesetName,
      ChangeSetType: changesetType,
      Description: "Created by aws-governance-base",
      StackName: stackName,
      TemplateBody: templateBody,
      Parameters: [
        {
          ParameterKey: "AppName",
          ParameterValue: this.awsGovBaseConfig.General.AppName,
        },
      ],
      Tags: [{ Key: "AppName", Value: this.awsGovBaseConfig.General.AppName }],
    };
    const res = await this.cfnClient.send(
      new cfn.CreateChangeSetCommand(createChangeSetCommandInput)
    );
    console.log(res);
    const changesetId = res.Id;
    if (changesetId === undefined)
      throw new Error("ChangeSet ID is undefined.");
    return { changesetId: changesetId, changesetType: changesetType };
  };

  private hasStack = async (stackName: string): Promise<boolean> => {
    try {
      const res = await this.cfnClient.send(
        new cfn.DescribeStacksCommand({ StackName: stackName })
      );
      if (res.Stacks?.length != 1) return false;
      // REVIEW_IN_PROGRESS だったら gov-base 全体のデプロイを止める
      if (res.Stacks[0].StackStatus == "REVIEW_IN_PROGRESS")
        throw new Error(`Stack status of ${stackName} is REVIEW_IN_PROGRESS.`);
      return true;
    } catch (e) {
      if (e instanceof cfn.CloudFormationServiceException) {
        if (e.message.includes(`Stack with id ${stackName} does not exist`)) {
          return false;
        } else {
          console.error(e);
          // console.log(e.message, "\n", e.name, "\n", e.stack);
          throw e;
        }
      } else {
        console.log(e);
        throw e;
      }
    }
  };

  private waitForChangeset = async (
    changeSetId: string,
    stackName: string
  ): Promise<void> => {
    const waiterConfiguration: WaiterConfiguration<cfn.CloudFormationClient> = {
      client: this.cfnClient,
      maxWaitTime: 300,
      minDelay: 5,
      maxDelay: 10,
    };
    const describeChangeSetCommandInput: cfn.DescribeChangeSetCommandInput = {
      ChangeSetName: changeSetId,
      StackName: stackName,
    };
    console.log("waitUntilChangeSetCreateComplete", "waiting...");
    try {
      await cfn.waitUntilChangeSetCreateComplete(
        waiterConfiguration,
        describeChangeSetCommandInput
      );
      console.log("waitUntilChangeSetCreateComplete", "done");
    } catch (e: any) {
      try {
        const payload = JSON.parse(e.message);
        const status: string = payload.result?.reason?.Status;
        const reason: string = payload.result?.reason?.StatusReason;

        console.log(status, reason);

        if (status !== undefined && reason !== undefined) {
          if (
            (status == "FAILED" &&
              reason.includes(
                "The submitted information didn't contain changes."
              )) ||
            reason.includes("No updates are to be performed")
          ) {
            // アップデートが無かった時のエラー
            throw new ChangeEmptyError(stackName);
          }
        }
        throw e;
      } catch (ee) {
        throw ee;
      }
    }
  };

  private executeChangeset = async (
    changeSetId: string,
    stackName: string
  ): Promise<void> => {
    const executeChangeSetCommandInput: cfn.ExecuteChangeSetCommandInput = {
      ChangeSetName: changeSetId,
      StackName: stackName,
      DisableRollback: false,
    };
    const ret = await this.cfnClient.send(
      new cfn.ExecuteChangeSetCommand(executeChangeSetCommandInput)
    );
  };

  private waitForExecute = async (
    stackName: string,
    changesetType: string
  ): Promise<void> => {
    const waiterConfiguration: WaiterConfiguration<cfn.CloudFormationClient> = {
      client: this.cfnClient,
      maxWaitTime: 600,
      minDelay: 5,
      maxDelay: 30,
    };
    const describeStacksCommandInput: cfn.DescribeStacksCommandInput = {
      StackName: stackName,
    };

    console.log("waiter[execute changeset]", "waiting...");
    if (changesetType == "CREATE") {
      console.log("stack create complete");
      await cfn.waitUntilStackCreateComplete(
        waiterConfiguration,
        describeStacksCommandInput
      );
    } else if (changesetType == "UPDATE") {
      console.log("stack update complete");
      await cfn.waitUntilStackUpdateComplete(
        waiterConfiguration,
        describeStacksCommandInput
      );
    } else {
      new Error(`Invalid changeset type [${changesetType}].`);
    }
    console.log("waiter[execute changeset]", "done");
  };

  private updateTerminationProtection = async (
    stackName: string,
    enableTerminationProtection: boolean
  ): Promise<void> => {
    const updateTerminationProtectionCommandInput: cfn.UpdateTerminationProtectionCommandInput =
      {
        StackName: stackName,
        EnableTerminationProtection: enableTerminationProtection,
      };
    const ret = await this.cfnClient.send(
      new cfn.UpdateTerminationProtectionCommand(
        updateTerminationProtectionCommandInput
      )
    );
  };
}
