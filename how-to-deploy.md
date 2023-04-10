# デプロイ手順

## 🚀 1. 開発環境を準備する

[./system-requirement.md](./system-requirement.md)

## 🚀 2. 設定ファイルを作成する

[./configuration-file-format.md](./configuration-file-format.md)

## 🚀 3. AWS SSO でログインする

```shell
$ aws sso login --profile プロファイル名
```

## 🚀 4. セットアップを実行する

セットアップのコマンドには下記 2 種類がある。

- 構成をデプロイ
- KMS の Key Policy を一括更新

以降、それぞれについて詳細に説明する。

### 🛸 構成をデプロイする場合

構成をデプロイするコマンドは `npm start -- setup` 。

#### 必須オプション

- `-c`  
  設定ファイルを指定する。

```shell
$ # 例
$ npm start -- setup -c ~/foo/agb-config.yaml
```

#### 任意オプション

- `--feature`  
  デプロイする機能を１つ指定する。  
  指定可能な feature の値は下記の通り。

  - [common](./cfn/common/README.md)
  - [account-password-policy](./src/feature/account-password-policy.ts)
  - [jump](./cfn/jump/README.md)
  - [guard-duty](./cfn/guard-duty/README.md)
  - [iam-access-analyzer](./cfn/iam-access-analyzer/README.md)
  - [event-aggregation](./cfn/event-aggregation/README.md)
  - [event-notification](./cfn/event-notification/README.md)
  - [devops-guru](./cfn/devops-guru/README.md)
  - [config-rule](./cfn/config-rule/README.md)
  - [auto-remediation](./cfn/auto-remediation/README.md)
  - [detective](./cfn/detective/README.md)

- `--aws-account-id`  
  デプロイ対象の AWS アカウントを１つ指定する。

- `--region`  
  デプロイ対象のリージョンを１つ指定する。

- `--debug`  
  デバッグ用に出力する情報を増やす。

```shell
$ # 例
$ # CONAN : guard-duty feature を AWSアカウント:012345678901 の ap-northeast-1 にデプロイ。
$ # デバッグ用に多くの情報を出力。
$ npm start -- setup -c ~/foo/agb-config.yaml --feature guard-duty --aws-account-id 012345678901 --region ap-northeast-1 --debug
```

### 🛸 KMS の Key Policy を一括更新する場合

KMS の Key Policy を一括更新するコマンドは `npm start -- batch-put-kms-key-policy` 。

#### 必須オプション

- `-c`  
  設定ファイルを１つ指定する。

- `--key-policy-file`  
  キーポリシーを定義したファイルを１つ指定する。  
  このファイルのフォーマットはポリシーを JSON 形式で定義したもの。

  - 設定ファイルに記述されている `${AWS::AccountId}` は デプロイ対象の AWS Account ID に置換される。
  - 設定ファイルに記述されている `${AWS::Region}` はデプロイ対象のリージョンに置換される。

  ファイルの例

  ```json
  {
    "Version": "2012-10-17",
    "Id": "my-key-policy",
    "Statement": [
      {
        "Sid": "Enable IAM User Permissions",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::${AWS::AccountId}:root"
        },
        "Action": "kms:*",
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "*"
        },
        "Action": [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "kms:CallerAccount": "${AWS::AccountId}"
          }
        }
      },
      {
        "Sid": "cloudwatch-logs",
        "Effect": "Allow",
        "Principal": {
          "Service": "logs.${AWS::Region}.amazonaws.com"
        },
        "Action": [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ],
        "Resource": "*",
        "Condition": {
          "ArnLike": {
            "kms:EncryptionContext:aws:logs:arn": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*"
          }
        }
      }
    ]
  }
  ```

- `--key-alias-name`  
  キーポリシーを適用する対象のキーのエイリアス名を１つ指定する。

```shell
$ # 例
$ npm start -- batch-put-kms-key-policy -c ~/foo/agb-config.yaml --key-policy-file ~/foo/kms-key-policy.json --key-alias-name alias/foo-cmk
```

#### 任意オプション

- `--aws-account-id`  
  デプロイ対象の AWS アカウントを１つ指定する。

- `--region`  
  デプロイ対象のリージョンを１つ指定する。

- `--debug`  
  デバッグ用に出力する情報を増やす。

- `--dry-run`  
  実際には更新しない。  
  既に設定されているポリシーの内容と、これから設定するポリシーの内容を比較して更新が発生するかどうかを表示する。

```shell
$ # 任意オプションを全部指定した例
$ npm start -- batch-put-kms-key-policy -c ~/foo/agb-config.yaml --key-policy-file ~/foo/kms-key-policy.json --key-alias-name alias/foo-cmk --aws-account-id 012345678901 --region ap-northeast-1 --dry-run --debug
```
