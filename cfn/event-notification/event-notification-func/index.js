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
    console.log(snsEvent);

    const snsMessage = snsEvent.Message;
    originalEvent = JSON.parse(snsMessage);
    console.log("ORIGINAL EVENT:");
    console.log(originalEvent);
  } catch (e) {
    console.log("illegal event format.");
    console.log(e);
  }

  try {
    // teams に投稿するメッセージを作成する
    let teamsTitle;
    let teamsMessage;
    if (
      originalEvent.source == "aws.securityhub" &&
      originalEvent["detail-type"] == "Security Hub Findings - Imported"
    ) {
      // Security Hub Findings の場合

      for (const element of originalEvent.detail.findings) {
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
          ${sourceUrl}`;
        } else {
          // GuardDuty 意外の場合

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
          ${sourceUrl}`;
        }

        await postMessage(teamsTitle, teamsMessage);
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const postMessage = async (teamsTitle, teamsMessage) => {
  // teams に投稿する
  const teamsIncomingWebHookUrl =
    process.env.GOV_BASE__SECURITY_HUB_TEAMS_INCOMING_WEBHOOK_URL_DEV;

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
