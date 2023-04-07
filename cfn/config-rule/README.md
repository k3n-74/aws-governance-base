# config-rule

## 🚀 機能

AWS Config Rule の設定。

## 🚀 CFn テンプレートとデプロイ ターゲット

[デプロイのコード](../../src/feature/config-rule.ts)

### 🛸 config-rule.yaml

下記 Config Rule の設定が含まれている。

- `CLOUDWATCH_LOG_GROUP_ENCRYPTED`
- `S3_DEFAULT_ENCRYPTION_KMS`

以下、それぞれについて説明する。

#### :robot: `CLOUDWATCH_LOG_GROUP_ENCRYPTED`

CloudWatch LogGroup がデジ戦から提供されている CMK で暗号化されているかを確認。

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
> 下記リージョンは非対応なのでデプロイ対象外。  
> "cn-north-1", //Beijing  
> "ap-southeast-3", //Jakarta  
> "me-central-1", //UAE  
> "ap-northeast-3", //Osaka  
> "eu-south-2", //Spain  
> "cn-northwest-1", //Ningxia  
> "eu-central-2", //Zurich  
> https://docs.aws.amazon.com/config/latest/developerguide/cloudwatch-log-group-encrypted.html

#### :robot: `S3_DEFAULT_ENCRYPTION_KMS`

S3 Bucket のデフォルト暗号設定がデジ戦から提供されている CMK で暗号化になっているかを確認。

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
> 下記リージョンは非対応なのでデプロイ対象外。  
> "ap-southeast-3", //Jakarta  
> "me-central-1", //UAE  
> "ap-northeast-3", //Osaka  
> "eu-south-2", //Spain  
> "eu-central-2", //Zurich  
> https://docs.aws.amazon.com/config/latest/developerguide/s3-default-encryption-kms.html
