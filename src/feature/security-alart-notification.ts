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
  Stack,
} from "../util";
import { logger } from "../logger";
import ac from "ansi-colors";
import * as s3 from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";

type RunBuildLambdaFunctionCommand = {
  // stdOutString: string;
  // stdErrorString: string;
  // childProcessWithoutNullStreams: ChildProcessWithoutNullStreams;
  code: number | null;
  // childProcessWithoutNullStreams: ChildProcessByStdio;
};

export class SecurityAlartNotificationFeature {
  // Lambda関数を早くデプロイしたときのフィーチャー名
  private readonly FEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC =
    "fast-deploy--alart-notificator-func";
  private readonly featureNameList = [
    "security-alart-notification",
    this.FEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC,
  ];

  public constructor() {}
  public setup = async (): Promise<void> => {
    // セットアップ対象外の機能だったら何もしないで終了
    if (!isSetupTargetFeature(this.featureNameList)) return;

    const isfeatureFastDeployAlartNotificatorFunc =
      this.FEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC ==
      C.i.commandOptions.feature
        ? true
        : false;

    // Auditアカウント以外のリストを作成する
    // GuestアカウントのリストからAWS Account IDだけのリストを作成する
    const awsAccountIdsExceptAudit: string[] = C.i.structure.Guests.map(
      (account) => {
        return account.id;
      }
    );
    // Jumpアカウントを追加する
    awsAccountIdsExceptAudit.push(C.i.structure.Jump.id);

    // Auditアカウント かつ Base Region がデプロイ対象に含まれているときのみ
    // Lambda関数のデプロイ作業をする。
    let lambdaS3Bucket = `${C.i.general.AppName}---cfn-assets---${C.i.general.BaseRegion}-${C.i.structure.Audit.id}`;
    let lambdaS3Key = `cfn/security-alart-notification/security-alart-notificator-func/function-${new Date().getTime()}.zip`;
    let lambdaS3ObjectVersion: string | undefined = "";
    if (
      isSetupTargetAwsAccount(C.i.structure.Audit.id) &&
      isSetupTargetRegion(C.i.general.BaseRegion)
    ) {
      // Auditアカウントにデプロイ
      // Lambda関数をビルド
      // 高速デプロイの時はキャッシュを使う
      await this.buildLambdaFunction({
        noCache: !isfeatureFastDeployAlartNotificatorFunc,
      });

      // Lambda関数をS3にアップロード
      const lambdaZipFileName = `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator-func/temp/function.zip`;
      const fileStream = fs.createReadStream(lambdaZipFileName);

      const credential = await getSsoCredential(C.i.structure.Audit.id);
      const s3Client = new s3.S3Client({
        credentials: credential,
        region: C.i.general.BaseRegion,
      });

      const putObjectCommandOutput = await s3Client.send(
        new PutObjectCommand({
          Bucket: lambdaS3Bucket,
          Key: lambdaS3Key,
          Body: fileStream,
        })
      );
      lambdaS3ObjectVersion = putObjectCommandOutput.VersionId;
      logger.debug("putObjectCommandOutput:\n", putObjectCommandOutput);

      // function.zip を削除
      fs.unlinkSync(lambdaZipFileName);
    }

    // Auditアカウントにデプロイ
    // デプロイするスタックのリストを生成する
    let auditStacks: Stack[] = [
      {
        templateName: "security-alart-notificator",
        templateFilePath: `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator.yaml`,
        parameters: [
          {
            ParameterKey: "SecurityHubTeamsIncomingWebhookUrlDev",
            ParameterValue: C.i.securityHub.TeamsIncomingWebhookUrl.Dev,
          },
          {
            ParameterKey: "LambdaS3Bucket",
            ParameterValue: lambdaS3Bucket,
          },
          {
            ParameterKey: "LambdaS3Key",
            ParameterValue: lambdaS3Key,
          },
          {
            ParameterKey: "LambdaS3ObjectVersion",
            ParameterValue: lambdaS3ObjectVersion,
          },
        ],
      },
    ];
    // もし、--featureオプションでFEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC が
    // 指定されていなかったら他のスタックもデプロイする。
    if (!isfeatureFastDeployAlartNotificatorFunc) {
      auditStacks = auditStacks.concat([
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
      ]);
    }

    await deploy({
      awsAccountId: C.i.structure.Audit.id,
      region: C.i.general.BaseRegion,
      stacks: auditStacks,
    });

    // Auditアカウント以外にデプロイ
    // もし、--featureオプションでFEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC が
    // 指定されていなかったらAuditアカウント以外にもデプロイする。
    if (!isfeatureFastDeployAlartNotificatorFunc) {
      for (const awsAccountId of awsAccountIdsExceptAudit) {
        // Audit
        await deploy({
          awsAccountId: awsAccountId,
          region: C.i.general.BaseRegion,
          stacks: [
            {
              templateName: "event-bus-source-send-event-to-target-account",
              templateFilePath: `${__dirname}/../../cfn/security-alart-notification/event-bus-source-send-event-to-target-account.yaml`,
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
    }
  };

  private buildLambdaFunction = async (args: {
    noCache: boolean;
  }): Promise<void> => {
    try {
      const res = await this.runBuildLambdaFunctionCommand({
        noCache: args.noCache,
      });
      logger.debug(`docker buildx build command returns exit_code=${res.code}`);
      if (res.code != 0) {
        logger.error(
          ac.red(`docker buildx build command returns exit_code=${res.code}`)
        );
        throw new Error(
          `docker buildx build command returns exit_code=${res.code}`
        );
      }
    } catch (e) {
      logger.error(e);
      throw e;
    }
  };

  private runBuildLambdaFunctionCommand = (args: {
    noCache: boolean;
  }): Promise<RunBuildLambdaFunctionCommand> => {
    return new Promise((resolve, reject) => {
      const dockerBuildOptions = args.noCache
        ? ["buildx", "build", "--output temp", "--no-cache", "."]
        : ["buildx", "build", "--output temp", "."];
      const command = spawn("docker", dockerBuildOptions, {
        shell: true,
        cwd: `${__dirname}/../../cfn/security-alart-notification/security-alart-notificator-func`,
        // timeoutは5分
        timeout: 1000 * 60 * 5,
        // stdio: ["pipe", "pipe", "pipe"], // ビルド中に何も出力しない
        stdio: ["pipe", "inherit", "inherit"], // ビルド中の過程を出力する
      });

      // let stdOutString = "";
      // let stdErrorString = "";
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
          // stdOutString: stdOutString,
          // stdErrorString: stdErrorString,
          // childProcessWithoutNullStreams: command,
          code: code,
        });
      });
      command.on("exit", function (code) {
        return resolve({
          // stdOutString: stdOutString,
          // stdErrorString: stdErrorString,
          code: code,
        });
      });
      command.on("error", function (err) {
        return reject(err);
      });
    });
  };
}
