import { Wait } from "testcontainers";
import { DEFAULT_CHEKOV_IMAGE } from "./BaseImages";
import { EndToEndTestContainer, EndToEndTestContainerOptions } from "./EndToEndTestContainer";

export interface ChekovContainerOptions extends EndToEndTestContainerOptions {
  hostnames?: string[];
  baseDomain: string;
  mkcertRootCertDir: string;
  logsDir: string;
}

export class ChekovContainer extends EndToEndTestContainer {

  constructor({
    image = DEFAULT_CHEKOV_IMAGE,
    name,
    network,
    hostnames,
    baseDomain,
    mkcertRootCertDir,
    logsDir
  }: ChekovContainerOptions) {
    super({ image, name, network });
    const containerMkCertDir = "/etc/nginx/mkcert";
    this.withDefaultBindMounts([
        { source: "/var/run/docker.sock", target: "/var/run/docker.sock", mode: "ro" },
        {
            source: mkcertRootCertDir,
            target: containerMkCertDir,
            mode: "ro",
        },
        { source: logsDir, target: "/var/log/nginx", mode: "rw" },
        { source: logsDir, target: "/var/log/devcontainer-nginx", mode: "rw" },
        { source: logsDir, target: "/var/log/chekov", mode: "rw" },
    ]);
    if (hostnames && hostnames.length > 0) {
        this.withLabels({
            "chekov.aliases": hostnames.join(",")
        });
    }
    this.withExtraHosts([{ host: "host.docker.internal", ipAddress: "host-gateway" }])
        .withEnvironment({
            BASE_DOMAIN: baseDomain,
            DOCKER_SOCKET: "/var/run/docker.sock",
            NGINX_CONFIG_PATH: "/etc/nginx/conf.d/generated.conf",
            TLS_CERT: "/etc/nginx/certs/wildcard.crt",
            TLS_KEY: "/etc/nginx/certs/wildcard.key",
            LOCAL_CA_CERT: `${containerMkCertDir}/rootCA.pem`,
            LOCAL_CA_KEY: `${containerMkCertDir}/rootCA-key.pem`,
            DEBOUNCE_MS: "500",
        })
        .withExposedPorts(
            { container: 80, host: 80 },
            { container: 443, host: 443 },
        )
        .withWaitStrategy(Wait.forHealthCheck())
        .withStartupTimeout(2 * 60 * 1000)
  }
}