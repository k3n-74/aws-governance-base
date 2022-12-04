const axios = require("axios");
const sts = require("@aws-sdk/client-sts");
const iam = require("@aws-sdk/client-iam");
const cloudwatch = require("@aws-sdk/client-cloudwatch");

exports.handler = async (event, context) => {
  // オリジナルのイベントデータを取得する
  let originalEvent;
  try {
    console.log("EVENT:");
    console.log(JSON.stringify(event));

    console.log("CONTEXT:");
    console.log(JSON.stringify(context));

    const snsEvent = JSON.parse(event.Records[0].body);
    console.log("SNS EVENT:");
    console.log(JSON.stringify(snsEvent));

    const snsMessage = snsEvent.Message;
    originalEvent = JSON.parse(snsMessage);
    console.log("ORIGINAL EVENT:");
    console.log(JSON.stringify(originalEvent));
  } catch (e) {
    console.log("illegal event format.");
    console.log(e);
  }

  try {
    // AppConfigから設定を読み込む
    let configAppName = "";
    let configEnvName = "";
    if (context.functionVersion == "$LATEST") {
      // LATESTの場合
      configAppName = `${process.env.GOV_BASE__APP_NAME}---dev--event-notification`;
      configEnvName = "dev";
    } else {
      // prod エイリアスの場合
      configAppName = `${process.env.GOV_BASE__APP_NAME}---event-notification`;
      configEnvName = "prod";
    }
    const eventNotificationTargetConfig =
      await getEventNotificationTargetConfig(configAppName, configEnvName);

    console.log(eventNotificationTargetConfig);

    const EVENT_NOTIFICATION_TARGET_SECURITY_HUB =
      eventNotificationTargetConfig.SecurityHub;
    const EVENT_NOTIFICATION_TARGET_DEVOPS_GURU =
      eventNotificationTargetConfig.DevOpsGuru;

    // // 環境変数から通知先設定を読み込む
    // const EVENT_NOTIFICATION_TARGET_SECURITY_HUB = JSON.parse(
    //   process.env.GOV_BASE__EVENT_NOTIFICATION_TARGET_SECURITY_HUB
    // );
    // const EVENT_NOTIFICATION_TARGET_DEVOPS_GURU = JSON.parse(
    //   process.env.GOV_BASE__EVENT_NOTIFICATION_TARGET_DEVOPS_GURU
    // );

    console.log(EVENT_NOTIFICATION_TARGET_SECURITY_HUB);
    console.log(EVENT_NOTIFICATION_TARGET_DEVOPS_GURU);

    if (
      // aws.securityhub
      originalEvent.source == "aws.securityhub" &&
      originalEvent["detail-type"] == "Security Hub Findings - Imported"
    ) {
      // Security Hub Findings の場合

      const eventId = originalEvent.id;

      for (const element of originalEvent.detail.findings) {
        // Security Hub用のIncoming Web Hook URL を取得する
        const teamsIncomingWebHookUrl = findIncomingWebHookUrl(
          element.AwsAccountId,
          EVENT_NOTIFICATION_TARGET_SECURITY_HUB
        );
        if (element.ProductName == "GuardDuty") {
          // GuardDuty の場合
          const eventId = originalEvent.id;
          await postGuardDutyMessage(eventId, element, teamsIncomingWebHookUrl);
        } else if (element.ProductName == "Config") {
          // Config Rule の場合
          await postConfigMessage(eventId, element, teamsIncomingWebHookUrl);
        } else if (element.ProductName == "Security Hub") {
          // Security Hub のコントロールの通知は多いので何もしない。
          console.log("PASS : Product name is Security Hub.");
        } else {
          // 残りの場合
          await postGeneralSecurityHubMessage(
            eventId,
            element,
            teamsIncomingWebHookUrl
          );
        }
      }
    } else if (
      // aws.devops-guru
      originalEvent.source == "aws.devops-guru" &&
      originalEvent["detail-type"] == "DevOps Guru New Insight Open"
    ) {
      // DevOps Guru の場合
      // DevOps Guru用のIncoming Web Hook URL を取得する
      const teamsIncomingWebHookUrl = findIncomingWebHookUrl(
        originalEvent.account,
        EVENT_NOTIFICATION_TARGET_DEVOPS_GURU
      );
      await postDevOpsGuruMessage(originalEvent, teamsIncomingWebHookUrl);
    } else if (
      // aws.health
      originalEvent.source == "aws.health" &&
      originalEvent["detail-type"] == "AWS Health Event"
    ) {
      // AWS Health (アカウント固有イベント) の場合
      // Security Hub用のIncoming Web Hook URL を取得する
      const teamsIncomingWebHookUrl = findIncomingWebHookUrl(
        originalEvent.account,
        EVENT_NOTIFICATION_TARGET_SECURITY_HUB
      );
      await postAwsHealthAccountSpecificEventMessage(
        originalEvent,
        teamsIncomingWebHookUrl
      );
    } else {
      console.log("PASS : NO MATCH");
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const getAssumeRoledCredentials = async (awsAccountId) => {
  const stsClient = new sts.STSClient({ region: process.env.AWS_REGION });
  // エイリアスを取得したいアカウントに assume role する
  const assumeRoleCommandOutput = await stsClient.send(
    new sts.AssumeRoleCommand({
      DurationSeconds: 3600,
      RoleArn: `arn:aws:iam::${awsAccountId}:role/${process.env.GOV_BASE__APP_NAME}---assume-role-from-event-notification-func`,
      RoleSessionName: "event-notification-func",
    })
  );
  console.log(
    "ACCESS KEY ID:",
    assumeRoleCommandOutput.Credentials.AccessKeyId
  );

  const roleCreds = {
    accessKeyId: assumeRoleCommandOutput.Credentials.AccessKeyId,
    secretAccessKey: assumeRoleCommandOutput.Credentials.SecretAccessKey,
    sessionToken: assumeRoleCommandOutput.Credentials.SessionToken,
  };

  return roleCreds;
};

const getAwsAccountAlias = async (credentials) => {
  const iamClient = new iam.IAMClient({
    credentials: credentials,
    region: process.env.AWS_REGION,
  });
  const listAccountAliasesCommandOutput = await iamClient.send(
    new iam.ListAccountAliasesCommand({ MaxItems: 1 })
  );
  return listAccountAliasesCommandOutput.AccountAliases?.[0];
};

const createMetricPart = async (credentials, region, dataIdentifiers) => {
  const cloudwatchClient = new cloudwatch.CloudWatchClient({
    credentials: credentials,
    region: region,
  });

  let metricPart = "";

  const namespace = dataIdentifiers.namespace;
  const name = dataIdentifiers.name;
  const stat = dataIdentifiers.stat;
  const period = parseInt(dataIdentifiers.period);

  metricPart += `**Namespace** : ${namespace}<br/>`;

  const metrics = [];
  metrics.push(namespace);
  metrics.push(name);
  if (dataIdentifiers.dimensions.length > 0)
    metricPart += `**Dimensions** :<br/>`;
  for (const dim of dataIdentifiers.dimensions) {
    metrics.push(dim.name);
    metrics.push(dim.value);
    metricPart += `&nbsp;&nbsp;${dim.name} : ${dim.value}<br/>`;
  }

  metricPart += `**Stat** : ${stat}<br/>`;

  const metricWidget = {
    view: "timeSeries",
    stacked: false,
    metrics: [metrics],
    width: 480,
    height: 180,
    start: "-PT2H",
    end: "P0D",
    timezone: "+0900",
    period: period,
    stat: stat,
  };

  console.log(JSON.stringify(metricWidget));

  const getMetricWidgetImageCommandOutput = await cloudwatchClient.send(
    new cloudwatch.GetMetricWidgetImageCommand({
      OutputFormat: "png",
      MetricWidget: JSON.stringify(metricWidget),
    })
  );

  const uint8ArrayImageData =
    getMetricWidgetImageCommandOutput.MetricWidgetImage;
  const base64EncodedImageData =
    Buffer.from(uint8ArrayImageData).toString("base64");

  metricPart += `![Chart](data:image/png;base64,${base64EncodedImageData})`;

  return metricPart;
};

const findIncomingWebHookUrl = (
  awsAccountId,
  eventNotificationTargetDictionary
) => {
  for (const key of Object.keys(eventNotificationTargetDictionary)) {
    const element = eventNotificationTargetDictionary[key];
    if (element.AwsAccountIds.includes(awsAccountId)) {
      return element.TeamsIncomingWebhookUrl;
    }
  }
  throw new Error(
    `Teams Incoming Web Hook URL for ${awsAccountId} is not Found.`
  );
};

const postMessage = async (
  teamsTitle,
  teamsMessage,
  teamsIncomingWebHookUrl
) => {
  // teams に投稿する
  const res = await axios.post(
    teamsIncomingWebHookUrl,
    {
      title: teamsTitle,
      text: teamsMessage,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  console.log("STATUS CODE: ", res.status);
  if (res.status != 200) throw new Error("STATUS CODE IS " + res.status);
};

const postGuardDutyMessage = async (
  eventId,
  element,
  teamsIncomingWebHookUrl
) => {
  // ASFF Required attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-required-attributes.html
  const awsAccountId = element.AwsAccountId;
  const title = element.Title;
  const severity = element.Severity.Label;
  const types = element.Types.join(", ");
  const description = element.Description;

  // Optional top-level attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-top-level-attributes.html
  const region = element.Region ?? "";
  const sourceUrl = element.SourceUrl ?? "";

  const roleCreds = await getAssumeRoledCredentials(awsAccountId);
  const awsAccountAlias = (await getAwsAccountAlias(roleCreds)) ?? awsAccountId;

  // title, message を組み立てる
  const teamsTitle = `GuardDuty | ${awsAccountAlias} | ${region} | ${title}`;
  const teamsMessage = `**AWS Account ID** : ${awsAccountId}<br/>
            **Severity** : ${severity}<br/>
            **Types** : ${types}<br/>
            **Description** : ${description}<br/>
            ${sourceUrl}<br/>
            **event-id** : ${eventId}`;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};

const postConfigMessage = async (eventId, element, teamsIncomingWebHookUrl) => {
  // ASFF Required attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-required-attributes.html
  const awsAccountId = element.AwsAccountId;
  const title = element.Title;
  const severity = element.Severity.Label;
  const types = element.Types.join(", ");
  const description = element.Description;

  // Optional top-level attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-top-level-attributes.html
  const region = element.Region ?? "";
  // const sourceUrl = element.SourceUrl ?? "";
  const productName = element.ProductName ?? "";
  const configRuleName = element.ProductFields["aws/config/ConfigRuleName"];
  const sourceUrl = `https://${region}.console.aws.amazon.com/config/home?region=${region}#/rules/details?configRuleName=${configRuleName}`;

  const roleCreds = await getAssumeRoledCredentials(awsAccountId);
  const awsAccountAlias = (await getAwsAccountAlias(roleCreds)) ?? awsAccountId;

  // title, message を組み立てる
  const teamsTitle = `${productName} | ${awsAccountAlias} | ${region} | ${title}`;
  const teamsMessage = `**AWS Account ID** : ${awsAccountId}<br/>
            **Severity** : ${severity}<br/>
            **Types** : ${types}<br/>
            **Description** : ${description}<br/>
            ${sourceUrl}<br/>
            **event-id** : ${eventId}`;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};

const postGeneralSecurityHubMessage = async (
  eventId,
  element,
  teamsIncomingWebHookUrl
) => {
  // ASFF Required attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-required-attributes.html
  const awsAccountId = element.AwsAccountId;
  const title = element.Title;
  const severity = element.Severity.Label;
  const types = element.Types.join(", ");
  const description = element.Description;

  // Optional top-level attributes
  // https://docs.aws.amazon.com/securityhub/latest/userguide/asff-top-level-attributes.html
  const region = element.Region ?? "";
  const sourceUrl = element.SourceUrl ?? "";
  const productName = element.ProductName ?? "";

  const roleCreds = await getAssumeRoledCredentials(awsAccountId);
  const awsAccountAlias = (await getAwsAccountAlias(roleCreds)) ?? awsAccountId;

  // title, message を組み立てる
  const teamsTitle = `${productName} | ${awsAccountAlias} | ${region} | ${title}`;
  const teamsMessage = `**AWS Account ID** : ${awsAccountId}<br/>
    **Severity** : ${severity}<br/>
    **Types** : ${types}<br/>
    **Description** : ${description}<br/>
    ${sourceUrl}<br/>
    **event-id** : ${eventId}`;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};

const postDevOpsGuruMessage = async (
  originalEvent,
  teamsIncomingWebHookUrl
) => {
  const eventId = originalEvent.id;

  const awsAccountId = originalEvent.detail.accountId;
  const severity = originalEvent.detail.insightSeverity.toUpperCase();
  const description = originalEvent.detail.insightDescription;
  const region = originalEvent.detail.region;
  const sourceUrl = originalEvent.detail.insightUrl;

  const roleCreds = await getAssumeRoledCredentials(awsAccountId);
  const awsAccountAlias = (await getAwsAccountAlias(roleCreds)) ?? awsAccountId;

  // title, message を組み立てる
  const teamsTitle = `DevOps Guru | ${awsAccountAlias} | ${region} | ${description}`;
  const teamsMessageFirstPart = `**AWS Account ID** : ${awsAccountId}<br/>
    **Severity** : ${severity}<br/>
    ${sourceUrl}<br/>`;
  const teamsMessageLastPart = `**event-id** : ${eventId}`;

  let teamsMessageMetricsPart =
    "**< Aggregated metrics > -------------------**<br/>";
  // https://docs.aws.amazon.com/devops-guru/latest/userguide/working-with-eventbridge.html
  for (const anomaly of originalEvent.detail.anomalies) {
    for (const sourceDetail of anomaly.sourceDetails) {
      if (sourceDetail.dataSource == "CW_METRICS") {
        const metricPart = await createMetricPart(
          roleCreds,
          region,
          sourceDetail.dataIdentifiers
        );
        // console.log("INLINE IMAGE CHART:");
        // console.log(inlineImageChart);
        teamsMessageMetricsPart += `${metricPart}<br/>`;
      }
    }
  }

  const teamsMessage =
    teamsMessageFirstPart + teamsMessageMetricsPart + teamsMessageLastPart;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};

const postAwsHealthAccountSpecificEventMessage = async (
  originalEvent,
  teamsIncomingWebHookUrl
) => {
  const eventId = originalEvent.id;

  const awsAccountId = originalEvent.account;
  // const severity = originalEvent.detail.insightSeverity.toUpperCase();
  // const description = originalEvent.detail.insightDescription;
  const region = originalEvent.region;

  const service = originalEvent.detail.service;
  const eventTypeCode = originalEvent.detail.eventTypeCode;
  const eventTypeCategory = originalEvent.detail.eventTypeCategory;
  const startTime = originalEvent.detail.startTime;
  const endTime = originalEvent.detail.endTime;
  const latestDescription =
    originalEvent.detail.eventDescription[0]?.latestDescription;

  const eventArn = originalEvent.detail.eventArn;
  const sourceUrl = `https://health.aws.amazon.com/health/home#/account/event-log?eventID=${eventArn}&eventTab=details`;

  const roleCreds = await getAssumeRoledCredentials(awsAccountId);
  const awsAccountAlias = (await getAwsAccountAlias(roleCreds)) ?? awsAccountId;

  // title, message を組み立てる
  const teamsTitle = `Health | ${awsAccountAlias} | ${region} | ${eventTypeCode}`;
  const teamsMessage = `**AWS Account ID** : ${awsAccountId}<br/>
    **Service** : ${service}<br/>
    **Category** : ${eventTypeCategory}<br/>
    **Start** : ${startTime}<br/>
    **End** : ${endTime}<br/>
    **Latest Description** : ${latestDescription}<br/>
    ${sourceUrl}<br/>
    **event-id** : ${eventId}`;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};

const getEventNotificationTargetConfig = async (
  configAppName,
  configEnvName
) => {
  // AppConfigから設定を取得する

  const url = `http://localhost:2772/applications/${configAppName}/environments/${configEnvName}/configurations/event-notification-target`;

  const res = await axios.get(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log("GET APP CONFIG STATUS CODE: ", res.status);
  if (res.status != 200)
    throw new Error("Get AppConfig STATUS CODE IS " + res.status);
  return res.data;
};
