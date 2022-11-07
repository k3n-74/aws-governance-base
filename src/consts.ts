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
};

export class Consts {
  private static _i: Consts;

  public readonly general: General;
  public readonly structure: Structure;
  private constructor(initFuncInput: InitFuncInput) {
    this.general = initFuncInput.awsGovBaseConfig.General;
    this.structure = initFuncInput.awsGovBaseConfig.Structure;
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
