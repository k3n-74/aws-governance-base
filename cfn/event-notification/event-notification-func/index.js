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
      originalEvent.source == "aws.guardduty" &&
      originalEvent["detail-type"] == "GuardDuty Finding"
    ) {
      // GuardDutyの場合
      const awsAccountId = originalEvent.detail.accountId;
      const region = originalEvent.detail.region;
      const title = originalEvent.detail.title;
      const severity = originalEvent.detail.severity;
      const findingType = originalEvent.detail.type;
      const findingDescription = originalEvent.detail.description;
      const findingId = originalEvent.detail.id;
      teamsTitle = `GuardDuty | ${awsAccountId} | ${region} | ${title}`;
      teamsMessage = `**深刻度** : ${severity}  
      **検出タイプ** : ${findingType}  
      **説明** : ${findingDescription}  
      **リンク** : https://${region}.console.aws.amazon.com/guardduty/home?region=${region}#/findings?search=id%3D${findingId}`;
    }

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
  } catch (e) {
    console.error(e);
    throw e;
  }
};
