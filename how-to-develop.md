# 開発

## 🚀 開発環境

[./system-requirement.md](./system-requirement.md)

## 🚀 cfn-lint

cfn-lint のアップデートは下記を実行する。

```shell
ika-musume:/workspace$ poetry update cfn-lint
```

## 🚀 ディレクトリの説明

## 🚀 反省

### 🛸 スタックの削除が辛い

Terraform or CDK for Terraform に引っ越しするかな。

### 🛸 Audit アカウントを監査以外の用途でも使っている

下記２つにすればよかった。

- Audit  
   セキュリティー関係の調査用。
- Commons  
   共通機能を何でもここに置いてしまう。  
   セキュリティ関係の通知設定とかもここ。
