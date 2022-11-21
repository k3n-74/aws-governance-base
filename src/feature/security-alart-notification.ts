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
import * as lambda from "@aws-sdk/client-lambda";
import * as fs from "fs";
import * as crypto from "crypto";
import { S3Client } from "@aws-sdk/client-s3";

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
    let lambdaS3Key = "";
    // let lambdaS3ObjectVersion: string | undefined = "";

    if (
      isSetupTargetAwsAccount(C.i.structure.Audit.id) &&
      isSetupTargetRegion(C.i.general.BaseRegion)
    ) {
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

      // Lambda関数のZIPファイルのハッシュ値を取得
      const digest = this.generateSha256({ filePath: lambdaZipFileName });
      // S3 Object のキーを生成
      lambdaS3Key = `cfn/security-alart-notification/security-alart-notificator-func/func-${digest}.zip`;
      // S3 Object が存在するかを確認
      const isExistsLambdaZip = await this.isS3ObjectExists({
        s3Client: s3Client,
        BucketName: lambdaS3Bucket,
        Key: lambdaS3Key,
      });
      logger.debug("isExistsLambdaZip : ", isExistsLambdaZip);

      // S3 Object が存在しなかったらアップロードする
      if (!isExistsLambdaZip) {
        println("UPLOAD LAMBDA CODE TO S3 : START");
        const putObjectCommandOutput = await s3Client.send(
          new s3.PutObjectCommand({
            Bucket: lambdaS3Bucket,
            Key: lambdaS3Key,
            Body: fileStream,
          })
        );
        println("UPLOAD LAMBDA CODE TO S3 : DONE");
      }
      // lambdaS3ObjectVersion = putObjectCommandOutput.VersionId;
      // logger.debug("putObjectCommandOutput:\n", putObjectCommandOutput);

      // function.zip を削除
      fs.unlinkSync(lambdaZipFileName);

      if (isfeatureFastDeployAlartNotificatorFunc) {
        // Lambda関数のZIPだけを直接デプロイする
        // 開発中にLambda関数をデプロイしたくて実行しているのだから、
        // S3 Object が存在しているかどうかに関係なく下記処理を実行する。
        // 理由は、コードが複雑化するのが嫌だから。
        println("DEPLOY LAMBDA CODE ONLY : START");

        const lambdaClient = new lambda.LambdaClient({
          credentials: credential,
          region: C.i.general.BaseRegion,
        });

        const updateFunctionCodeCommandOutput = await lambdaClient.send(
          new lambda.UpdateFunctionCodeCommand({
            FunctionName: `${C.i.general.AppName}---security-alart-notificator`,
            S3Bucket: lambdaS3Bucket,
            S3Key: lambdaS3Key,
          })
        );

        println("DEPLOY LAMBDA CODE ONLY : DEPLOYED");
      }
    }

    // もし、--featureオプションでFEATURE_FAST_DEPLOY__ALART_NOTIFICATOR_FUNC が
    // 指定されていなかったらスタックのデプロイをする。
    if (!isfeatureFastDeployAlartNotificatorFunc) {
      // Auditアカウントにスタックをデプロイ
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
              {
                ParameterKey: "LambdaS3Bucket",
                ParameterValue: lambdaS3Bucket,
              },
              {
                ParameterKey: "LambdaS3Key",
                ParameterValue: lambdaS3Key,
              },
              // {
              //   ParameterKey: "LambdaS3ObjectVersion",
              //   ParameterValue: lambdaS3ObjectVersion,
              // },
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

      // Auditアカウント以外にスタックをデプロイ
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

  private generateSha256 = (args: { filePath: string }): string => {
    const buffer = fs.readFileSync(args.filePath);
    const hash = crypto.createHash("sha256").update(buffer);
    logger.debug("digest");
    logger.debug(hash.copy().digest("base64"));
    logger.debug(hash.copy().digest("base64url"));
    logger.debug(hash.copy().digest("hex"));
    return hash.digest("base64url");
  };

  private isS3ObjectExists = async (args: {
    s3Client: S3Client;
    BucketName: string;
    Key: string;
  }): Promise<boolean> => {
    try {
      const headObjectCommandOutput = await args.s3Client.send(
        new s3.HeadObjectCommand({
          Bucket: args.BucketName,
          Key: args.Key,
        })
      );
    } catch (e) {
      if (e instanceof s3.NotFound) {
        // S3 Object が存在しない場合。
        // この場合はエラーではない。
        return false;
      } else {
        // この場合はエラー。
        logger.error(e);
        throw e;
      }
    }
    // この場合はS3 Objectが存在する。
    return true;
  };
}
