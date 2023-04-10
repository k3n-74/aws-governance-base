# 動作環境

## 🚀 Docker

### 🛸 docker buildx プラグインが必要

Lambda 関数のビルドで docker buildx の機能を利用している。  
インストールされているかどうかは下記コマンドで確認。

```bash
$ docker buildx version
```

## 🚀 Dev Container

### 🛸 コンテナをビルドした後は下記を実行する

```shell
ika-musume:/workspace$ npm ci
ika-musume:/workspace$ poetry install --no-root
ika-musume:/workspace$ source ~/.profile
```
