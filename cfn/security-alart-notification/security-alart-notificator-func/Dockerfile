# 本Dockerfileのビルド方法は下記２種類
# DOCKER_BUILDKIT=1 docker build --output temp --no-cache .
# docker buildx build --output temp --no-cache .

# 共通の環境変数を宣言
ARG WORKDIR_PATH=/tmp/WORKDIR

##############################################################
# Lambda関数をビルドするためのコンテナ
##############################################################

FROM public.ecr.aws/docker/library/node:16.18.1-bullseye-slim AS build-stage

ARG WORKDIR_PATH

WORKDIR ${WORKDIR_PATH}

RUN set -xeu \
    && apt-get update \
    && apt-get -y install zip ca-certificates

COPY ./ ${WORKDIR_PATH}
RUN npm ci \
    && zip -r function.zip .

##############################################################
# ビルドした成果物だけを出力するためのコンテナ
# （最終ステージの成果物をビルド済みのLambda関数だけにしている）
##############################################################

FROM scratch AS export-stage
ARG WORKDIR_PATH
COPY --from=build-stage ${WORKDIR_PATH}/function.zip /
