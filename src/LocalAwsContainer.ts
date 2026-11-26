import { Wait } from "testcontainers";
import { DEFAULT_LOCAL_AWS_IMAGE } from "./BaseImages";
import { EndToEndTestContainer, EndToEndTestContainerOptions } from "./EndToEndTestContainer";

export interface LocalAwsContainerOptions extends EndToEndTestContainerOptions {
  hostname: string;
  containerPort: number;
}

export class LocalAwsContainer extends EndToEndTestContainer {

  constructor({
    image = DEFAULT_LOCAL_AWS_IMAGE,
    name,
    hostname,
    containerPort
  }: LocalAwsContainerOptions) {
    if (!hostname || !hostname.trim()) {
      throw new Error("A hostname is required");
    }

    super({ image, name });
    this.withLabels({
          "devcontainer.hostname": hostname,
          "devcontainer.application.port": String(containerPort),
          "chekov.aliases": `${hostname}, s3.${hostname}, *.s3.${hostname}`
      })
      .withEnvironment({
          AWS_DEFAULT_REGION: "eu-west-1",
      })
      .withExposedPorts(containerPort)
      .withWaitStrategy(
          Wait.forHttp("/_localstack/health", containerPort)
              .forStatusCode(200)
      )
      .withStartupTimeout(5 * 60 * 1000)
  }
}