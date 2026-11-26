import { Wait } from "testcontainers";
import { DEFAULT_MOCK_API_IMAGE } from "./BaseImages";
import { EndToEndTestContainer, EndToEndTestContainerOptions } from "./EndToEndTestContainer";

export interface MockApiContainerOptions extends EndToEndTestContainerOptions {
  fixtureDir: string;
  hostnames: string[];
  templating?: boolean;
}

export class MockApiContainer extends EndToEndTestContainer {

  constructor({
    image = DEFAULT_MOCK_API_IMAGE,
    name,
    network,
    fixtureDir,
    hostnames,
    templating
  }: MockApiContainerOptions) {
    if (hostnames.length === 0 || hostnames.some((hostname) => !hostname.trim())) {
      throw new Error("At least one hostname is required and none may be blank");
    }

    const containerWiremockConfigDir = "/wiremock-root";
    const containerPort = 80;
    super({ image, name, network });

    this.withDefaultBindMounts([{
        source: fixtureDir,
        target: containerWiremockConfigDir,
        mode: "ro",
    }]);

    const command = [
        "--root-dir",
        containerWiremockConfigDir,
        "--port",
        String(containerPort),
        "--verbose",
        ...(templating ? ["--local-response-templating"] : []),
    ];
    this.withLabels({
            "devcontainer.hostname": hostnames[0],
            "devcontainer.application.port": String(containerPort),
            "chekov.aliases": hostnames.join(",")
        })
        .withUser("root")
        .withCommand(command)
        .withExposedPorts(containerPort)
        .withWaitStrategy(
            Wait.forHttp("/__admin/health", containerPort).forStatusCode(
                200,
            ),
        )
        .withStartupTimeout(2 * 60 * 1000);
  }
}