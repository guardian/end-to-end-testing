import { GenericContainer } from "testcontainers";
import { BindMount } from "testcontainers/build/types";

export interface EndToEndTestContainerOptions {
  image?: string;
  name: string;
};

export abstract class EndToEndTestContainer extends GenericContainer {

  protected bindMountedDirs: BindMount[] = [];

  protected constructor(
    { image, name }: EndToEndTestContainerOptions
  ) {
    if (!image || !image.trim()) {
      throw new Error("A published application image reference is required");
    }

    super(image);
    this.withName(name);
  }

  protected withDefaultBindMounts(bindMounts: BindMount[]): this {
    this.bindMountedDirs = bindMounts;
    return this.withBindMounts([]);
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    return super.withBindMounts(bindMounts.concat(this.bindMountedDirs));
  }
}
