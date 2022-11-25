// const AWS = require("aws-sdk")
const axios = require("axios");

exports.handler = async (event, context) => {
  // オリジナルのイベントデータを取得する
  let originalEvent;
  try {
    console.log("EVENT:");
    console.log(JSON.stringify(event));

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
    // 環境変数を読み込む
    const EVENT_NOTIFICATION_TARGET_SECURITY_HUB = JSON.parse(
      process.env.GOV_BASE__EVENT_NOTIFICATION_TARGET_SECURITY_HUB
    );
    const EVENT_NOTIFICATION_TARGET_DEVOPS_GURU = JSON.parse(
      process.env.GOV_BASE__EVENT_NOTIFICATION_TARGET_DEVOPS_GURU
    );
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
    } else {
      console.log("PASS : NO MATCH");
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
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

  // title, message を組み立てる
  const teamsTitle = `GuardDuty | ${awsAccountId} | ${region} | ${title}`;
  const teamsMessage = `**Severity** : ${severity}<br/>
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

  // title, message を組み立てる
  const teamsTitle = `${productName} | ${awsAccountId} | ${region} | ${title}`;
  const teamsMessage = `**Severity** : ${severity}<br/>
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

  // title, message を組み立てる
  const teamsTitle = `${productName} | ${awsAccountId} | ${region} | ${title}`;
  const teamsMessage = `**Severity** : ${severity}<br/>
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

  const awsAccountId = originalEvent.account;
  const severity = originalEvent.detail.insightSeverity.toUpperCase();
  const description = originalEvent.detail.insightDescription;
  const region = originalEvent.region;
  const sourceUrl = originalEvent.detail.insightUrl;

  // title, message を組み立てる
  const teamsTitle = `DevOps Guru | ${awsAccountId} | ${region} | ${description}`;
  const teamsMessage = `**Severity** : ${severity}<br/>
    ${sourceUrl}<br/>
    **event-id** : ${eventId}`;

  // メッセージ送信する。
  await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
};
