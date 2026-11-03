# syntax=docker/dockerfile:1
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV AWS_SDK_LOAD_CONFIG=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    g++ \
    make \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:/root/.local/share/mise/shims:${PATH}"