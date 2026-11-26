// A function so the tag is read from the environment when the container is constructed, not at import time.
export const defaultApplicationImage = () =>
  `ghcr.io/guardian/end-to-end-testing/application:${process.env.APPLICATION_IMAGE_TAG}`;

export const DEFAULT_CHEKOV_IMAGE =
  "ghcr.io/guardian/chekov/nginx:sha-bba0c91f9bc695df29e550b9ecd3bbc2b79d2d38";

export const DEFAULT_LOCAL_AWS_IMAGE = "localstack/localstack:4";

export const DEFAULT_MOCK_API_IMAGE = "wiremock/wiremock:3.13.2";
