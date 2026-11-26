import { GenericContainer, Wait } from "testcontainers";
import { DEFAULT_LOCAL_AWS_IMAGE } from "./BaseImages";

export type LocalAwsContainerOptions = {
  image?: string;
  name: string;
  hostname: string;
  containerPort: number;
};

export class LocalAwsContainer extends GenericContainer {

  constructor({
    image = DEFAULT_LOCAL_AWS_IMAGE,
    name,
    hostname,
    containerPort
  }: LocalAwsContainerOptions) {
    if (!image || !image.trim()) {
      throw new Error("A published application image reference is required");
    }
    if (!hostname || !hostname.trim()) {
      throw new Error("A hostname is required");
    }

    super(image);
    this.withName(name)
      .withLabels({
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