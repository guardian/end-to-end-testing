import { GenericContainer, PortWithOptionalBinding, Wait } from "testcontainers";
import { BindMount } from "testcontainers/build/types";

export type ApplicationContainerOptions = {
  image?: string;
  name: string;
  exposedPorts: PortWithOptionalBinding[];
  healthCheckPort: number;
  healthCheckPath: string;
  projectHostPath: string;
  projectExcludePaths?: string[];
  projectContainerPath: string;
  caRootCertFile?: string;
  coursierCacheDir?: string;
  ivyCacheDir?: string;
  npmCacheDir?: string;
  aptCacheDir?: string;
};

export class ApplicationContainer extends GenericContainer { 
  
  private bindMountedDirs: BindMount[] = [];
  
  constructor(
    {
      image = `ghcr.io/guardian/end-to-end-testing/application:${process.env.APPLICATION_IMAGE_TAG}`,
      exposedPorts,
      healthCheckPort,
      healthCheckPath,
      projectHostPath,
      projectExcludePaths,
      projectContainerPath,
      caRootCertFile,
      coursierCacheDir,
      ivyCacheDir,
      npmCacheDir,
      aptCacheDir
    }: ApplicationContainerOptions,
  ) {
    if (!image || !image.trim()) {
      throw new Error("A published application image reference is required");
    }

    const containerCaRootPath = "/etc/local-ca";
    super(image);
    const cacheMounts = [
      [projectHostPath, projectContainerPath],
      [coursierCacheDir, "/root/.cache/coursier/v1"],
      [ivyCacheDir, "/root/.ivy2/cache"],
      [npmCacheDir, "/root/.npm/_cacache"],
      [aptCacheDir, "/var/cache/apt/archives"],
    ] as const;
    for (const [source, target] of cacheMounts) {
      if (source) {
        this.bindMountedDirs.push({ source, target, mode: "rw" });
      }
    }

    this.withExposedPorts(...exposedPorts)
      // Allows for compiling the application on first start.
      .withStartupTimeout(10 * 60 * 1000)
      .withWorkingDir(projectContainerPath)
      .withBindMounts([])
      .withTmpFs(Object.fromEntries(
          (projectExcludePaths ?? []).map((path) => [path, "rw,exec"])
        )
      )
      .withWaitStrategy(
        Wait.forHttp(healthCheckPath, healthCheckPort).forStatusCode(200),
      )
      .withEnvironment({"CAROOT": containerCaRootPath});

    if (caRootCertFile) {
      this.withCopyFilesToContainer([
        {
          source: caRootCertFile,
          target: `${containerCaRootPath}/rootCA.pem`,
        }
      ]);
    }  
  }

  public withBindMounts(bindMounts: BindMount[]): this {
    return super.withBindMounts(bindMounts.concat(this.bindMountedDirs));
  }
}