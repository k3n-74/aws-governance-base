# Jump アカウント

## 🚀 機能

### 🛸 概要

- AWS Management Console も AWS CLI も MFA を強制する。
- Permissions Boundary Policy を強制する。  
  例えば「cdk bootstrap により作成される CDK Toolkit が内部的に作成する CFn 実行 Role を利用して IAM:User,IAM:Group, Swith Role の権限を越えた操作をする」といったことも不可能。
- IAM User の操作ログに記録される role session name は必ず IAM User Name と一致する。

### 🛸 Jump アカウント、Jump アカウント以外でできること

- Jump アカウントでできること

  - MFA 未完了の状態でできること

    - 自分のパスワードを変更
    - 自分の 仮想 MFA デバイスの管理
    - 自分のアクセスキー/シークレットアクセスキーの管理 (← 後日 要 MFA に修正する)

  - MFA 済みかつ Switch Role 前にできること
    - Switch Role の実行。  
      ただし、 RoleSessionName が IAM User Name と不一致の場合は拒絶する。

- Jump アカウント以外でできること
  - Switch Role 用の Role の権限内の作業

### 🛸 Swith Role 用の Role について

下記２つのロールがある。

- ExecutionRole
  > note: Jump アカウントには ExecutionRole リソースを作成しないので Switch Role できない。
  - Assume Role 受け入れ条件:  
    Jump アカウントから MFA 済み状態の場合
  - Policy:  
    `arn:aws:iam::aws:policy/AdministratorAccess`
  - Permissions Boundary Policy:  
    `${AppName}---permissions-boundary-for-role`
- ReadOnlyRole
  - Assume Role 受け入れ条件:  
    Jump アカウントから MFA 済み状態の場合
  - Policy:  
    `arn:aws:iam::aws:policy/ReadOnlyAccess`
  - Permissions Boundary Policy:  
    `${AppName}---permissions-boundary-for-role`

### 🛸 Permissions Boundary Policy について

- Policy Name:  
  `${AppName}---permissions-boundary-for-role`
- 拒否内容
  - IAM User の操作。
  - 本 Permissions Boundary Policy を含まない IAM Role の操作。
  - 本 Permissions Boundary Policy の操作。
  - Permissions Boundary が付与された IAM User, IAM Role から Permissions Boundary を外す。
  - CloudTrail の下記操作
    - "cloudtrail:DeleteTrail"
    - "cloudtrail:PutEventSelectors"
    - "cloudtrail:StopLogging"
    - "cloudtrail:UpdateTrail"
  - AWS Config の下記操作
    - "config:DeleteConfigurationRecorder"
    - "config:DeleteDeliveryChannel"
    - "config:DeleteRetentionConfiguration"
    - "config:PutConfigurationRecorder"
    - "config:PutDeliveryChannel"
    - "config:PutRetentionConfiguration"
    - "config:StopConfigurationRecorder"

## 🚀 デプロイ

### 🛸 Jump アカウントに対するデプロイ作業

```shell
$ export JUMP_AWS_ACCOUNT_ID="xxxxxx"

$ # permissions boundary
$ aws cloudformation deploy --stack-name gov-base---permissions-boundary --template-file ./permissions-boundary.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # group
$ aws cloudformation deploy --stack-name gov-base---switch-role-users-group --template-file ./switch-role-users-group.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # switch role target
$ aws cloudformation deploy --stack-name gov-base---switch-role-target-role --template-file ./switch-role-target-role.yaml --parameter-overrides JumpAwsAccountId=${JUMP_AWS_ACCOUNT_ID} --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset
```

### 🛸 Jump アカウント以外に対するデプロイ作業

```shell
$ export JUMP_AWS_ACCOUNT_ID="xxxxxx"

$ # permissions boundary
$ aws cloudformation deploy --stack-name gov-base---permissions-boundary --template-file ./permissions-boundary.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # switch role target
$ aws cloudformation deploy --stack-name gov-base---switch-role-target-role --template-file ./switch-role-target-role.yaml --parameter-overrides JumpAwsAccountId=${JUMP_AWS_ACCOUNT_ID} --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset
```

## 🚀 使い方

### 🛸 IAM User を発行

1. IAM User を作成するための管理アカウントで IAM User を作成したときに、そのユーザを必ず IAM:Group `${AppName}---switch-role-users` に所属させること。

### 🛸 IAM User の初回利用

1. Jump アカウントにログイン後、AWS Management Console で IAM User のページに移動し、自分の IAM User に仮想 MFA デバイスを登録する。
1. AWS Management Console からログアウトして、再度ログインする。  
   ここで 仮想 MFA デバイスによる認証を求められる。
1. 上記認証が完了したら Switch Role できる。

### 🛸 CDK の利用

Permissions Boundary の適用強制により `cdk bootstrap`を実行してもエラーになる。  
ここで、例えば root account といった権限が強いユーザで `cdk bootstrap` を実行すると権限が弱いユーザが自分の権限を越えた操作をする抜け道が作成されてしまう。  
こういったセキュリティ問題を引き起こさない`cdk bootstrap` の実行方法については下記リポジトリを参照。  
https://github.com/k3n-74/cdk-bootstrap-with-permissions-boundary-and-kms-cmk
