# end-to-end-testing
Provide reusable code and docker images to help set up a local stack for end-to-end testing

## Application Image

[container-images/application.Dockerfile](container-images/application.Dockerfile)
is a base image for running an application under test in an end-to-end stack:
Ubuntu with build essentials and [mise](https://mise.jdx.dev/) for installing
the application's toolchain. It contains no application code.

CI tests the TypeScript package and builds the image for `linux/amd64` and
`linux/arm64`. Pull requests build without publishing. Pushes to `main`, version
tags, and manual runs publish to:

```text
ghcr.io/guardian/end-to-end-testing/application:sha-<full-commit>
ghcr.io/guardian/end-to-end-testing/application:latest
ghcr.io/guardian/end-to-end-testing/application:v0.1.0
```

`latest` is only produced from the default branch; version tags are produced
only for corresponding Git tags. Pin a SHA tag or digest in consuming projects.

Publishing uses `GITHUB_TOKEN` with `packages: write`. Enable Actions and package
creation for the repository. GHCR packages may initially be private: make
the package public for unauthenticated pulls, or authenticate consumers with
`docker login ghcr.io` and credentials permitted to read that package.

### Local Image Build

From the repository root, with Docker BuildKit available:

```sh
docker build -f container-images/application.Dockerfile -t end-to-end-testing/application:local container-images
```

## TypeScript Package

Requires Node.js 22.22 or newer. From the repository root:

```sh
npm ci
npm test
npm pack
```

The tarball contains JavaScript and TypeScript declarations. Install that
tarball in a consuming project alongside `testcontainers@^12.2.1`. This project
does not yet publish the npm package automatically.

```typescript
import { ApplicationContainer } from "end-to-end-testing";
import { Network } from "testcontainers";

const network = await new Network().start();
try {
  const app = await new ApplicationContainer(
    "ghcr.io/guardian/end-to-end-testing/application:sha-<full-commit>",
    { port: 9000, healthCheckPath: "/healthcheck" },
  )
    .withNetwork(network)
    .withNetworkAliases("app")
    .withBindMounts([{ source: "/path/to/app", target: "/app" }])
    .withWorkingDir("/app")
    .withCommand(["/app/start.sh"])
    .start();

  try {
    console.log(`http://${app.getHost()}:${app.getMappedPort(9000)}`);
  } finally {
    await app.stop();
  }
} finally {
  await network.stop();
}
```

The image has no application or start command, so the caller supplies them,
along with any backing services the application needs on the network.

`ApplicationContainer` extends `GenericContainer`, so network, environment,
bind mounts, log consumers, and other Testcontainers options remain available.
It pulls the specified image rather than building it, exposes the given port,
and waits up to ten minutes for HTTP 200 from the given health-check path.

Unit tests exercise configuration without Docker. They do not verify a running
stack.
