import { CredentialProvider } from "@aws-sdk/types";
import { fromSSO } from "@aws-sdk/credential-providers";
import { AwsGovBaseConfig } from "./aws-gov-base-config";

export const getSsoCredential = async (
  awsAccountId: string,
  profiles: AwsGovBaseConfig["General"]["Profiles"]
): Promise<CredentialProvider> => {
  const profileName = profiles[awsAccountId];
  if (profileName == null) throw Error("profile name is undefined.");
  return fromSSO({ profile: profileName });
};
