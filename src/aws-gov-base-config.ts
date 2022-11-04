import { string } from "yargs";

export type AwsGovBaseConfig = {
  General: {
    AppName: string;
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
