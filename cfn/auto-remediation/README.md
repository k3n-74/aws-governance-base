# auto-remediation

## 🚀 機能

AWS Config の自動修復機能の設定。

## 🚀 CFn テンプレートとデプロイ ターゲット

### 🛸 vpc-default-security-group-closed.yaml

Config Rule で default セキュリティーグループの問題を検知したら SSM Automation の 「default セキュリティーグループ内のルールを削除するランブック」を起動する。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &check;  |  &check;  |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &check;  |  &check;  |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &check;  |  &check;  |

> **Note**  
> 大阪リージョンは AWS Config ルールの修復アクション(AWS::Config::RemediationConfiguration)に非対応なのでデプロイ対象外。  
> https://docs.aws.amazon.com/ja_jp/config/latest/developerguide/remediation.html#region-support-config-remediation
