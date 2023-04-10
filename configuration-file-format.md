# 設定ファイル

設定ファイルのフォーマットについて説明する。  
設定ファイルのフォーマットは YAML であり、その詳細について実例にコメントを添えて説明する。

```yaml
General:
  # AppName
  # aws-governance-base の名前。
  # 原則 gov-base で固定。
  AppName: "gov-base"
  # BaseRegion
  # 主に利用するリージョン。
  # 原則 ap-northeast-1 で固定。
  BaseRegion: "ap-northeast-1"
  # Profiles
  # AWS Account ID と AWS CLI の名前付きプロファイル との関連付け情報。
  # {AWS Account ID} : {AWS CLI の名前付きプロファイルのプロファイル名}
  Profiles:
    "000000000000": "sso-jump-admin"
    "111111111111": "sso-audit-admin"
    "222222222222": "sso-dev0-admin"
    "333333333333": "sso-sta0-admin"
    "444444444444": "sso-prod-admin"
  # CmkAliasName
  # KMS CMK のエイリアス名
  CmkAliasName: "foo-cmk"

# Structure
# それぞれのAWS Accountが Jump, Audit, Guests のどれに該当するのかを定義する。
Structure:
  Jump:
    # Jump Account は１つのみ指定できる。
    id: "000000000000"
  Audit:
    # Audit Account は１つのみ指定できる。
    id: "111111111111"
  Guests:
    # Audit Account は複数個指定できる。
    - id: "222222222222"
    - id: "333333333333"
    - id: "444444444444"

# EventNotificationTarget
# イベントをteamsに通知するための設定。
EventNotificationTarget:
  # SecurityHubのイベントをteamsに通知する設定。
  # 下の例では Prod, Sta, Others の３種類の通知設定が定義されているが、
  # 任意の名前で任意の数の通知設定を定義できる。
  SecurityHub:
    Prod:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/98ty3hffg/123-456-789"
      AwsAccountIds:
        - "444444444444"
    Sta:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/jseg58ig5/123-456-789"
      AwsAccountIds:
        - "333333333333"
    Others:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/t4i8ghsdr/123-456-789"
      AwsAccountIds:
        - "222222222222"
        - "111111111111"
        - "000000000000"

  # DevOps Guruのイベントをteamsに通知する設定。
  # 下の例では Prod, Sta, Others の３種類の通知設定が定義されているが、
  # 任意の名前で任意の数の通知設定を定義できる。
  DevOpsGuru:
    Prod:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/98ty3hffg/123-456-789"
      AwsAccountIds:
        - "444444444444"
    Sta:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/jseg58ig5/123-456-789"
      AwsAccountIds:
        - "333333333333"
    Others:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/t4i8ghsdr/123-456-789"
      AwsAccountIds:
        - "222222222222"
        - "111111111111"
        - "000000000000"

# DevEventNotificationTarget
# teamsに対する通知機能を開発するときに使用する構成の設定。
# AWS Chatbotがteams対応したこともあり、今後本機能を開発することはないので
# 詳細な説明は省略する。
DevEventNotificationTarget:
  SecurityHub:
    All:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/jg43q8fgh/123-456-789"
      AwsAccountIds:
        - "000000000000"
        - "111111111111"
        - "222222222222"
        - "333333333333"
        - "444444444444"
  DevOpsGuru:
    All:
      TeamsIncomingWebhookUrl: "https://example.webhook.office.com/webhookb2/xxx-yyy-zzz@xxx-yyy-zzz/IncomingWebhook/jg43q8fgh/123-456-789"
      AwsAccountIds:
        - "000000000000"
        - "111111111111"
        - "222222222222"
        - "333333333333"
        - "444444444444"
```
