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

    // teams に投稿するメッセージを作成する
    let teamsTitle;
    let teamsMessage;
    if (
      originalEvent.source == "aws.securityhub" &&
      originalEvent["detail-type"] == "Security Hub Findings - Imported"
    ) {
      // Security Hub Findings の場合

      const eventId = originalEvent.id;

      for (const element of originalEvent.detail.findings) {
        const teamsIncomingWebHookUrl = findIncomingWebHookUrl(
          element.AwsAccountId,
          EVENT_NOTIFICATION_TARGET_SECURITY_HUB
        );
        if (element.ProductName == "GuardDuty") {
          // GuardDuty の場合

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
          teamsTitle = `GuardDuty | ${awsAccountId} | ${region} | ${title}`;
          teamsMessage = `**Severity** : ${severity}  
            **Types** : ${types}  
            **Description** : ${description}  
            ${sourceUrl}  
            **event-id** : ${eventId}`;

          // メッセージ送信する。
          await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
        } else if (element.ProductName == "Security Hub") {
          // Security Hub のコントロールの通知は多いので何もしない。
          console.log("PASS : Product name is Security Hub.");
        } else {
          // GuardDuty 以外の場合

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
          teamsTitle = `${productName} | ${awsAccountId} | ${region} | ${title}`;
          teamsMessage = `**Severity** : ${severity}  
            **Types** : ${types}  
            **Description** : ${description}  
            ${sourceUrl}  
            **event-id** : ${eventId}`;

          // メッセージ送信する。
          await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
        }
      }
    } else if (
      originalEvent.source == "aws.devops-guru" &&
      originalEvent["detail-type"] == "DevOps Guru New Insight Open"
    ) {
      // DevOps Guru の場合
      const teamsIncomingWebHookUrl = findIncomingWebHookUrl(
        originalEvent.account,
        EVENT_NOTIFICATION_TARGET_DEVOPS_GURU
      );

      const eventId = originalEvent.id;

      const awsAccountId = originalEvent.account;
      const severity = originalEvent.detail.insightSeverity.toUpperCase();
      const description = originalEvent.detail.insightDescription;
      const region = originalEvent.region;
      const sourceUrl = originalEvent.detail.insightUrl;

      // title, message を組み立てる
      teamsTitle = `DevOps Guru | ${awsAccountId} | ${region} | ${description}`;
      teamsMessage = `**Severity** : ${severity}  
        ${sourceUrl}  
        **event-id** : ${eventId}`;

      // メッセージ送信する。
      await postMessage(teamsTitle, teamsMessage, teamsIncomingWebHookUrl);
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
