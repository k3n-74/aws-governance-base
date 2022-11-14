FROM public.ecr.aws/docker/library/node:16.18.1-bullseye-slim AS build-stage

ARG WORKDIR_PATH=/tmp/WORKDIR

WORKDIR ${WORKDIR_PATH}

RUN set -xeu \
    && apt-get update \
    && apt-get -y install vim zip ca-certificates

COPY ./ ${WORKDIR_PATH}
RUN npm ci \
    && zip -r function.zip .


FROM scratch AS export-stage
COPY --from=build-stage /tmp/WORKDIR/function.zip /

# ビルド方法は下記２種類
# DOCKER_BUILDKIT=1 docker build --output temp --no-cache .
# docker buildx build --output temp --no-cache .
