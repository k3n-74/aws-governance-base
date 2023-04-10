# jump

## 🚀 機能

- jump アカウントにログインし、ターゲットのロールに Switch Role する。
- AWS Management Console も AWS CLI も MFA を強制する。
- Permissions Boundary Policy を強制する。  
  例えば「cdk bootstrap により作成される CDK Toolkit が内部的に作成する CFn 実行 Role を利用して IAM:User,IAM:Group, Swith Role の権限を越えた操作をする」といったことも不可能。
- IAM User の操作ログに記録される role session name は必ず IAM User Name と一致する。
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

## 🚀 CFn テンプレートとデプロイ ターゲット

[デプロイのコード](../../src/feature/jump.ts)

### 🛸 permissions-boundary.yaml

IAM Role のための permission boundary のための IAM Policy を定義している。

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

### 🛸 switch-role-users-group.yaml

下記が許可された IAM Group。

- Assume Role (IAM Role に Switch Role するため)
- 自分のアクセスキー／シークレットキーを管理
- 自分の仮想 MFA デバイスを管理

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

### 🛸 switch-role-target-role-for-jump.yaml

Jump AWS アカウントに作成する、Switch Role の受け入れ側の IAM Role。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

### 🛸 switch-role-target-role-for-audit.yaml

Audit AWS アカウントに作成する、Switch Role の受け入れ側の IAM Role。

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

### 🛸 switch-role-target-role-for-guest.yaml

Guest AWS アカウントに作成する、Switch Role の受け入れ側の IAM Role。

**Jump**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Audit**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|     &nbsp;     |  &nbsp;   |  &nbsp;   |

**Gust**

| ap-northeast-1 | us-east-1 | 左記 以外 |
| :------------: | :-------: | :-------: |
|    &check;     |  &nbsp;   |  &nbsp;   |

## 🚀 使い方

### 🛸 IAM User を追加

1. IAM User を作成するための管理アカウントで IAM User を作成したときに、そのユーザを必ず IAM:Group `${AppName}---switch-role-users` に所属させること。

### 🛸 IAM User の初回利用

1. Jump アカウントにログイン後、AWS Management Console で IAM User のページに移動し、自分の IAM User に仮想 MFA デバイスを登録する。
1. AWS Management Console からログアウトして、再度ログインする。  
   ここで 仮想 MFA デバイスによる認証を求められる。
1. 上記認証が完了したら Switch Role できる。
