# event-aggregation

## 🚀 機能

全 AWS アカウント、全リージョンの デフォルトイベントバスに流れる特定のイベントを、 Audit AWS アカウントのカスタムイベントバスに集約する。

## 🚀 CFn テンプレートとデプロイ ターゲット

[デプロイのコード](../../src/feature/event-aggregation.ts)

### 🛸 event-aggregation--event-bus.yaml

全 AWS アカウント、全リージョンのイベントを集約するカスタムイベントバスを作成する。

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

### 🛸 event-aggregation--send-event-to-master-rule.yaml

#### :robot: Security Hub のイベントを Audit アカウントのカスタムイベントバスに送信するルール

> **Warning**  
> IT 部門が払い出した AWS アカウント が Security Hub の設定として、全リージョンの Security Hub イベント集約設定をしている前提で、このようなデプロイターゲットになっている。

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

#### :robot: Security Hub 以外のイベントを Audit アカウントのカスタムイベントバスに送信するルール

具体的には下記イベント。

- DevOps Guru
- AWS Health
- 通知機能の開発＆テスト用に作成したイベント

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

### 🛸 event-aggregation--send-event-to-master-role.yaml

Event Rule が Audit アカウントのカスタムイベントバスにイベントを送信するための IAM Role。

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
