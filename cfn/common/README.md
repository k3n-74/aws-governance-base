# common

## 🚀 機能

aws-governance-base をデプロイをするときに必要なアセットをアップロードするための S3 Bucket。  
現在は Lambda 関数の ZIP ファイルをアップロードする用途でのみ利用している。

## 🚀 CFnテンプレートとデプロイ ターゲット

### 🛸 cfn-assets-storage.yaml  

- Jump

  | ap-northeast-1 | us-east-1 | 左記 以外 |
  | :------------: | :-------: | :-------: |
  |     &nbsp;     |  &nbsp;   |  &nbsp;   |

- Audit

  | ap-northeast-1 | us-east-1 | 左記 以外 |
  | :------------: | :-------: | :-------: |
  |    &check;     |  &nbsp;   |  &nbsp;   |

- Gust

  | ap-northeast-1 | us-east-1 | 左記 以外 |
  | :------------: | :-------: | :-------: |
  |     &nbsp;     |  &nbsp;   |  &nbsp;   |
