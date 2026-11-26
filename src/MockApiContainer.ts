import { GenericContainer, Wait } from "testcontainers";
import { BindMount } from "testcontainers/build/types";
import { DEFAULT_MOCK_API_IMAGE } from "./BaseImages";

export type MockApiContainerOptions = {
  image?: string;
  name: string;
  fixtureDir: string;
  hostnames: string[];
  templating?: boolean;
};

export class MockApiContainer extends GenericContainer {

  private bindMountedDirs: BindMount[] = [];
  
  constructor({
    image = DEFAULT_MOCK_API_IMAGE,
    name,
    fixtureDir,
    hostnames,
    templating
  }: MockApiContainerOptions) {
    if (!image || !image.trim()) {
      throw new Error("A published application image reference is required");
    }
    if (hostnames.length === 0) {
      throw new Error("At least one hostname is required");
    }

    const containerWiremockConfigDir = "/wiremock-root";
    const containerPort = 80;
    super(image);

    this.bindMountedDirs = [{
        source: fixtureDir,
        target: containerWiremockConfigDir,
        mode: "ro",
    }];

    const command = [
        "--root-dir",
        containerWiremockConfigDir,
        "--port",
        String(containerPort),
        "--verbose",
        ...(templating ? ["--local-response-templating"] : []),
    ];
    this.withName(name)
        .withLabels({
            "devcontainer.hostname": hostnames[0],
            "devcontainer.application.port": String(containerPort),
            "chekov.aliases": hostnames.join(",")
        })
        .withUser("root")
        .withBindMounts([])
        .withCommand(command)
        .withExposedPorts(containerPort)
        .withWaitStrategy(
            Wait.forHttp("/__admin/health", containerPort).forStatusCode(
                200,
            ),
        )
        .withStartupTimeout(2 * 60 * 1000);
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    return super.withBindMounts(bindMounts.concat(this.bindMountedDirs));
  }
}