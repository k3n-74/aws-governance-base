import * as cfn from "@aws-sdk/client-cloudformation";

export type CommandOptions = {
  feature: string | undefined;
  awsAccountId: string | undefined;
  region: string | undefined;
  keyPolicyFile: string | undefined;
  keyAliasName: string | undefined;
  isDryRun: boolean;
};

export type General = {
  AppName: string;
  BaseRegion: string;
  Profiles: Record<string, string>;
  CmkAliasName: string;
};

export type Structure = {
  Jump: {
    id: string;
  };
  Audit: {
    id: string;
  };
  Guests: [{ id: string }];
};

export type EventNotificationInfo = {
  TeamsIncomingWebhookUrl: string;
  AwsAccountIds: string[];
};

export type EventNotificationTarget = {
  SecurityHub: Record<string, EventNotificationInfo>;
  DevOpsGuru: Record<string, EventNotificationInfo>;
};

export type AwsGovBaseConfig = {
  General: General;
  Structure: Structure;
  EventNotificationTarget: EventNotificationTarget;
};

export type InitFuncInput = {
  awsGovBaseConfig: AwsGovBaseConfig;
  commandOptions: CommandOptions;
};

export class Consts {
  private static _i: Consts;

  public readonly general: General;
  public readonly structure: Structure;
  public readonly eventNotificationTarget: EventNotificationTarget;
  public readonly commandOptions: CommandOptions;
  public readonly parameters: cfn.Parameter[];
  public readonly tags: cfn.Tag[];
  public readonly notificationEventPatternSourceList: string[] = [
    "aws.securityhub",
    "aws.devops-guru",
    "aws.health",
  ];
  private constructor(initFuncInput: InitFuncInput) {
    this.general = initFuncInput.awsGovBaseConfig.General;
    this.structure = initFuncInput.awsGovBaseConfig.Structure;
    this.eventNotificationTarget =
      initFuncInput.awsGovBaseConfig.EventNotificationTarget;
    this.commandOptions = initFuncInput.commandOptions;

    this.parameters = [
      {
        ParameterKey: "AppName",
        ParameterValue: initFuncInput.awsGovBaseConfig.General.AppName,
      },
    ];
    this.tags = [
      { Key: "AppName", Value: initFuncInput.awsGovBaseConfig.General.AppName },
    ];
  }
  public static get i(): Consts {
    if (!this._i) {
      throw Error("No instance.");
    }
    return this._i;
  }

  public static init(initFuncInput: InitFuncInput): void {
    this._i = new Consts(initFuncInput);
  }
}
