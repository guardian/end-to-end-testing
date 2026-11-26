import { PortWithOptionalBinding, getContainerPort, Wait } from "testcontainers";
import { BindMount } from "testcontainers/build/types";
import { posix } from "node:path";
import { defaultApplicationImage } from "./BaseImages";
import { EndToEndTestContainer, EndToEndTestContainerOptions } from "./EndToEndTestContainer";

export type ExposedPortWithHostNames = { port: PortWithOptionalBinding; hostNames?: string[] };

export interface ApplicationContainerOptions extends EndToEndTestContainerOptions {
  exposedPorts: ExposedPortWithHostNames[];
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

export class ApplicationContainer extends EndToEndTestContainer {

  constructor(
    {
      image = defaultApplicationImage(),
      name,
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
    const containerCaRootPath = "/etc/local-ca";
    super({ image, name });
    const cacheMounts = [
      [projectHostPath, projectContainerPath],
      [coursierCacheDir, "/root/.cache/coursier/v1"],
      [ivyCacheDir, "/root/.ivy2/cache"],
      [npmCacheDir, "/root/.npm/_cacache"],
      [aptCacheDir, "/var/cache/apt/archives"],
    ] as const;
    const bindMounts: BindMount[] = [];
    for (const [source, target] of cacheMounts) {
      if (source) {
        bindMounts.push({ source, target, mode: "rw" });
      }
    }

    this.withDefaultBindMounts(bindMounts)
      .withExposedPorts(...exposedPorts.map(p => p.port))
      // Allows for compiling the application on first start.
      .withStartupTimeout(10 * 60 * 1000)
      .withWorkingDir(projectContainerPath)
      .withTmpFs(Object.fromEntries(
          (projectExcludePaths ?? []).map((path) => [
            posix.resolve(projectContainerPath, path),
            "rw,exec",
          ])
        )
      )
      .withLabels(this.routeLabels(exposedPorts))
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

  private routeLabels(exposedPorts: ExposedPortWithHostNames[]): Record<string, string> {
    const namedPorts = exposedPorts.filter(p => p.hostNames && p.hostNames.length > 0);
    const namedPortsWithAliases = exposedPorts.filter(p => p.hostNames && p.hostNames.length > 1);
    const metadataLabels: Record<string, string> = namedPorts.length > 0 ? {
      'devcontainer.metadata': JSON.stringify([{
        forwardPorts: namedPorts.map(p => getContainerPort(p.port)),
        portsAttributes: Object.fromEntries(
          namedPorts.map(p => [getContainerPort(p.port), { label: p.hostNames![0] }]),
        ),
      }]),
    } : {};
    const aliasLabels: Record<string, string> = Object.fromEntries(
      namedPortsWithAliases.map(p => [`chekov.aliases.${getContainerPort(p.port)}`, p.hostNames!.join(",")]),
    );

    return {
      ...metadataLabels,
      ...aliasLabels,
    };
  }
}
