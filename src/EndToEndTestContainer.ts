import { GenericContainer, StartedNetwork } from "testcontainers";
import { BindMount } from "testcontainers/build/types";

export interface EndToEndTestContainerOptions {
  image?: string;
  name: string;
  network: StartedNetwork;
}

export abstract class EndToEndTestContainer extends GenericContainer {

  protected bindMountedDirs: BindMount[] = [];

  protected constructor(
    { image, name, network }: EndToEndTestContainerOptions
  ) {
    if (!image || !image.trim()) {
      throw new Error(`A published image reference is required for ${name}`);
    }

    super(image);
    this.withName(name)
      .withNetwork(network);
  }

  protected withDefaultBindMounts(bindMounts: BindMount[]): this {
    this.bindMountedDirs = bindMounts;
    return this.withBindMounts([]);
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    return super.withBindMounts(bindMounts.concat(this.bindMountedDirs));
  }
}
