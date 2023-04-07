# detective

## 🚀 機能

Amazon Detective の設定。

## 🚀 CFn テンプレートとデプロイ ターゲット

### 🛸 detective.yaml

Amazon Detective を有効化する。

> **Warning**  
> Detective は GuardDuty をセットアップしてから 48 時間以上経過した後にデプロイすること。  
> https://docs.aws.amazon.com/ja_jp/detective/latest/adminguide/detective-prerequisites.html

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
> 大阪リージョンは Amazon Detective 非対応なのでデプロイ対象外。
