import { CredentialProvider } from "@aws-sdk/types";
import { Consts as C, AwsGovBaseConfig } from "../consts";
import { getSsoCredential } from "../credential-provider";
import {
  ChildProcessWithoutNullStreams,
  spawn,
  ChildProcessByStdio,
} from "child_process";
import {
  print,
  println,
  isSetupTargetFeature,
  isSetupTargetAwsAccount,
  isSetupTargetRegion,
  deploy,
  DeployFuncInput,
} from "../util";
import { logger } from "../logger";

type RunCommandFuncOutput = {
  stdOutString: string;
  stdErrorString: string;
  // childProcessWithoutNullStreams: ChildProcessWithoutNullStreams;
  code: number | null;
  // childProcessWithoutNullStreams: ChildProcessByStdio;
};

export class SecurityAlartNotificationFeature {
  private readonly featureName = "security-alart-notification";
  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureName)) return;

    // Auditアカウント以外のリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const awsAccountIdsExceptAudit: string[] = C.i.structure.Guests.map(
      (account) => {
        return account.id;
      }
    );
    // Jumpアカウントを追加する
    awsAccountIdsExceptAudit.push(C.i.structure.Jump.id);

    // Auditアカウントにデプロイ
    // Lambda関数をビルド
    await this.buildLambdaFunction();

    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: [
        {
          templateName: "security-alart-notificator",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator.yaml`,
          parameters: [
            {
              ParameterKey: "SecurityHubTeamsIncomingWebhookUrlDev",
              ParameterValue: C.i.securityHub.TeamsIncomingWebhookUrl.Dev,
            },
          ],
        },
        {
          templateName: "event-bus-target-guardduty-listener",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-target-guardduty-listener.yaml`,
        },
        {
          templateName: "event-bus-target",
          templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-target.yaml`,
          parameters: [
            {
              ParameterKey: "SourceAwsAccountIds",
              ParameterValue: awsAccountIdsExceptAudit.join(", "),
            },
          ],
        },
      ],
    });

    // Auditアカウント以外にデプロイ
    for (const awsAccountId of awsAccountIdsExceptAudit) {
      // Audit
      await deploy({
        awsAccountId: awsAccountId,
        region: C.i.general.BaseRegion,
        stacks: [
          {
            templateName: "event-bus-source-guardduty-event",
            templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-source-guardduty-event.yaml`,
            parameters: [
              {
                ParameterKey: "TargetAwsAccountId",
                ParameterValue: C.i.structure.Audit.id,
              },
            ],
          },
        ],
      });
    }
  };

  private buildLambdaFunction = async (): Promise<void> => {
    try {
      const result = await this.runBuildLambdaFunctionCommand();
      logger.debug("docker buildx build : exit code :", result.code);
      logger.debug(result.stdOutString);
    } catch (e) {
      logger.error(e);
      throw e;
    }
  };

  private runBuildLambdaFunctionCommand = (): Promise<RunCommandFuncOutput> => {
    return new Promise((resolve, reject) => {
      const command = spawn(
        "docker",
        ["buildx", "build", "--output temp", "--no-cache", "."],
        {
          shell: true,
          cwd: `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator-func`,
          // timeoutは5分
          timeout: 1000 * 60 * 5,
          // stdio: ["pipe", "pipe", "pipe"], // ビルド中に何も出力しない
          stdio: ["pipe", "inherit", "inherit"], // ビルド中の過程を出力する
        }
      );

      let stdOutString = "";
      let stdErrorString = "";
      // // stdio: ["pipe", "inherit", "inherit"], だと stdout, stderr を取得できるはずが
      // // 全然取得できない。
      // command.stdout.on("data", function (data) {
      //   //TODO バグ：構築中に出力されるテキストを全く取得できない
      //   stdOutString += data.toString();
      //   println(data.toString());
      // });
      // command.stderr.on("data", function (data) {
      //   stdErrorString += data.toString();
      //   //TODO printErrorln を作る
      // });
      command.on("close", function (code) {
        return resolve({
          stdOutString: stdOutString,
          stdErrorString: stdErrorString,
          // childProcessWithoutNullStreams: command,
          code: code,
        });
      });
      command.on("exit", function (code) {
        return resolve({
          stdOutString: stdOutString,
          stdErrorString: stdErrorString,
          code: code,
        });
      });
      command.on("error", function (err) {
        return reject(err);
      });
    });
  };
}
