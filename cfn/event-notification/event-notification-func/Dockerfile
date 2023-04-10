# 本Dockerfileのビルド方法は下記２種類
# DOCKER_BUILDKIT=1 docker build --output temp --no-cache .
# docker buildx build --output temp --no-cache .

# 共通の環境変数を宣言
ARG WORKDIR_PATH=/tmp/WORKDIR

##############################################################
# Lambda関数をビルドするためのコンテナ
##############################################################

FROM public.ecr.aws/docker/library/node:18.12.1-bullseye-slim AS build-stage

ARG WORKDIR_PATH

WORKDIR ${WORKDIR_PATH}

RUN set -xeu \
    && apt-get update \
    && apt-get -y install zip ca-certificates

# node package のインストールに対してのみキャッシュが効くように
# npm ci に必要なものだけコピーして npm ci を実行。  
COPY ./package.json ./package-lock.json ${WORKDIR_PATH}
RUN npm ci --omit=dev

# 改めて全ファイルをコピー
COPY ./ ${WORKDIR_PATH}

RUN zip -r function.zip .

##############################################################
# ビルドした成果物だけを出力するためのコンテナ
# （最終ステージの成果物をビルド済みのLambda関数だけにしている）
##############################################################

FROM scratch AS export-stage
ARG WORKDIR_PATH
COPY --from=build-stage ${WORKDIR_PATH}/function.zip /
