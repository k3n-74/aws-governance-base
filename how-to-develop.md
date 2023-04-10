# 開発

## 🚀 開発環境

[./system-requirement.md](./system-requirement.md)

## 🚀 cfn-lint

cfn-lint のアップデートは下記を実行する。

```shell
ika-musume:/workspace$ poetry update cfn-lint
```

## 🚀 ディレクトリの説明

## 🚀 Lambda 関数のデプロイ

開発用のデプロイオプションを下に説明する。

- Lambda 関数をデプロイするが Alias には発行しない  
  `--lambda-disable-publish-to-alias` オプション

  ```shell
  $ # 例
  $ npm start -- setup -c ~/foo/agb-config.yaml --feature event-notification --aws-account-id 012345678901 --region ap-northeast-1 --lambda-disable-publish-to-alias --debug
  ```

- Lambda 関数を高速にデプロイ  
  feature として`fast-deploy--event-notification-func`を指定する。

  ```shell
  $ # 例
  $ npm start -- setup -c ~/foo/agb-config.yaml --feature fast-deploy--event-notification-func --aws-account-id 012345678901 --region ap-northeast-1 --debug
  ```

## 🚀 反省

### 🛸 スタックの削除が辛い

インポート機能が実用的な Terraform or CDK for Terraform に引っ越しするかな。  
でも、そうしたら今度は tfstate ファイルの管理という問題が出てくる。  
CFn VS Terraform どっちが良いのか悩ましい。

### 🛸 Audit アカウントを監査以外の用途でも使っている

下記２つにすればよかった。

- Audit  
   セキュリティー関係の調査用。
- Commons  
   共通機能を何でもここに置いてしまう。  
   セキュリティ関係の通知設定とかもここ。
