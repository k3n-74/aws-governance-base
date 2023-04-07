# event-notification

## 🚀 機能

下記のイベントを teams に通知する。

- Security Hub
- DevOps Guru
- AWS Health

## 🚀 CFn テンプレートとデプロイ ターゲット

[デプロイのコード](../../src/feature/event-notification.ts)

### 🛸 event-notification.yaml

下記処理の流れ、リソースを構築。  
EventBridge Events -> SNS -> SQS -> Lambda

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

### 🛸 event-notification-config.yaml

Lambda 関数に渡す AppConfig の構成。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

### 🛸 event-notification-config--dev.yaml

Lambda 関数に渡す AppConfig の構成（開発用）。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

### 🛸 event-notification-assume-role-target.yaml

Lambda 関数が別 AWS アカウントの情報を取得するための Assume Role を受ける IAM Role。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |
