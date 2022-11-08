import * as cfn from "@aws-sdk/client-cloudformation";

export type CommandOptions = {
  feature: string | undefined;
  awsAccountId: string | undefined;
  region: string | undefined;
};

export type General = {
  AppName: string;
  BaseRegion: string;
  Profiles: Record<string, string>;
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

export type AwsGovBaseConfig = {
  General: General;
  Structure: Structure;
};

export type InitFuncInput = {
  awsGovBaseConfig: AwsGovBaseConfig;
  commandOptions: CommandOptions;
};

export class Consts {
  private static _i: Consts;

  public readonly general: General;
  public readonly structure: Structure;
  public readonly commandOptions: CommandOptions;
  public readonly parameters: cfn.Parameter[];
  public readonly tags: cfn.Tag[];
  private constructor(initFuncInput: InitFuncInput) {
    this.general = initFuncInput.awsGovBaseConfig.General;
    this.structure = initFuncInput.awsGovBaseConfig.Structure;
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
