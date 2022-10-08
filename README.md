# aws-governance-base

AWS Config, CloudTrail, SecurityHub がセットアップされている環境に対して Governance Base として必要な追加のセットアップをする。  
対象としている AWS アカウントの運用方法はマルチアカウント運用。

> note: 下記前提の構成になっている。
>
> - デフォルトリージョンは ap-northeast-1
> - Security Hub のリージョン集約が機能している

## 🚀 Dev Container の使い方

- コンテナのビルドをした後は下記を実行する。

  ```shell
  ika-musume:/workspace$ npm ci
  ika-musume:/workspace$ poetry install --no-root
  ika-musume:/workspace$ source ~/.profile
  ```

- cfn-lint のアップデートは下記を実行する。
  ```shell
  ika-musume:/workspace$ poetry update cfn-lint
  ```

## 🚀 構成要素

> note:
>
> - デプロイは下記構成の順番でデプロイすること。
> - デプロイ手順は構成ごとのドキュメントに記載してある。

- Jump アカウント  
  [./cfn/jump/README.md](./cfn/jump/README.md)
