# syntax=docker/dockerfile:1
FROM ubuntu:24.04@sha256:9c7f200c07e3d4a03e7249d2c16bf66a51120fb876aa2242cf31451412543289

ENV DEBIAN_FRONTEND=noninteractive
ENV AWS_SDK_LOAD_CONFIG=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    bash \
    git \
    make \
    openssl \
    mkcert \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:/root/.local/share/mise/shims:${PATH}"

COPY --chmod=755 application-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/application-entrypoint.sh"]