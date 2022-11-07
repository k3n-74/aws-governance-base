import { CredentialProvider } from "@aws-sdk/types";
import { fromSSO } from "@aws-sdk/credential-providers";
import { Consts as C, General } from "./consts";

export const getSsoCredential = async (
  awsAccountId: string
): Promise<CredentialProvider> => {
  const profileName = C.i.general.Profiles[awsAccountId];
  if (profileName == null) throw Error("profile name is undefined.");
  return fromSSO({ profile: profileName });
};
