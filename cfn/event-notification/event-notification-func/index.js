// const AWS = require("aws-sdk")
const axios = require("axios");
const { rmSync } = require("fs");

exports.handler = async (event, context) => {
  try {
    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));
    const message = JSON.parse(event.Records[0].body).Message;
    console.log("message:\n" + message);
    console.log("message.title:\n" + JSON.parse(message).title);
    console.log("message.text:\n" + JSON.parse(message).text);
  } catch (e) {
    console.log("event is not JSON.:\n" + event);
  }

  try {
    const teamsIncomingWebHookUrl =
      process.env.GOV_BASE__SECURITY_HUB_TEAMS_INCOMING_WEBHOOK_URL_DEV;
    const message = JSON.parse(event.Records[0].body).Message;
    console.log("MESSAGE::\n" + message);
    // const foo = "<br/>- **項目**<br/>あああああああ<br/>- **みだし**<br/>いいいいいいい"
    const data = JSON.stringify({
      title: JSON.parse(message).title,
      text: JSON.parse(message).text.replaceAll("\n", "<br/>"),
    });

    const res = await axios.post(
      teamsIncomingWebHookUrl,
      {
        title: JSON.parse(message).title,
        text: JSON.parse(message).text.replaceAll("\n", "<br/>"),
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
