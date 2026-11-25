# end-to-end-testing
Provide reusable code and docker images to help set up a local stack for end-to-end testing

## Application Image

[container-images/application.Dockerfile](container-images/application.Dockerfile)
is a base image for running an application under test in an end-to-end stack:
Ubuntu with build essentials and [mise](https://mise.jdx.dev/) for installing
the application's toolchain. It contains no application code.

The project must have a `.tool-versions` file in its root directory. Use that
directory as the container's working directory. For `ApplicationContainer`,
set `projectContainerPath` to the project root inside the container.

If the application needs the optional local CA in its JVM trust store, declare
Java in `.tool-versions`. The entrypoint runs `mise install` before
`mkcert -install`. If Java is not yet installed when `mkcert` runs, it may not
add the CA to the JVM trust store.

The image has no default command. Set `CMD` in a derived image, pass a command
to `docker run`, or use `.withCommand([...])` on `ApplicationContainer`.

On every push to `main`, CI tags the image `sha-<full-commit-id>` using the
pushed commit. Other runs use `dev-<image-input-hash>`, derived
from the Dockerfile and entrypoint script. For either tag,
CI skips publication if GHCR confirms it exists; otherwise it builds and pushes
for `linux/amd64` and `linux/arm64`. Fork and Dependabot PRs do not publish.

The image workflow returns the tag to CI, which passes it to package builds
through `APPLICATION_IMAGE_TAG`. Vite embeds this value in the library bundle;
consumers do not need to set it. Local builds without that variable use the
same calculation as GitHub Actions `hashFiles`: SHA-256 of the two binary
file digests in filename order. This is not an image digest: rebuilding the
same inputs can pick up updated base images or tools.

Publishing uses `GITHUB_TOKEN` with `packages: write`. Enable Actions and package
creation for the repository. The published image is public, so Docker and
Testcontainers can pull it without authentication both locally and in CI.

### Local Image Build

From the repository root, with Docker BuildKit available:

```sh
docker build -f container-images/application.Dockerfile -t end-to-end-testing/application:local container-images
```

## TypeScript Package

Requires Node.js 22.22 or newer. From the repository root:

```sh
npm ci
npm run build
npm pack
```

The tarball contains JavaScript and TypeScript declarations. Install that
tarball in a consuming project alongside `testcontainers@^12.2.1`.

### Publishing to npm

The package workflow builds the package on pull
requests and pushes to `main`. After those checks pass on `main`, Changesets
opens or updates a release pull request with version and changelog updates.
Merging that pull request publishes the new version to the public npm registry.
If the current version has never been published, a run on `main` with no pending
changesets can publish it directly.

For each package change, run `npm run changeset`, choose the version bump, and
commit the generated file alongside the change. `npm run release` builds and
publishes unpublished versions; it is normally run by CI.

### Snapshot Releases

Run `npm run changeset` and commit the generated changeset to a pull request
whose branch is in this repository. Add the `🐥 Canaries` label to the PR.
After the image and build jobs succeed, CI publishes a snapshot under npm's
`canary` tag without changing `latest`. Fork PRs and manual workflow runs do
not publish snapshots.

To install the most recently published canary:

```sh
npm install @guardian/end-to-end-testing@canary
```

To test a specific PR snapshot, install the exact `package@version` from the
workflow's PR comment. The `canary` tag can move when another PR publishes.
After publishing, CI removes the label; reapply it to request another snapshot.

### Usage

```typescript
import { ApplicationContainer } from "@guardian/end-to-end-testing";
import { Network } from "testcontainers";

const network = await new Network().start();
try {
  const app = await new ApplicationContainer({
    name: "app",
    exposedPorts: [9000],
    healthCheckPort: 9000,
    healthCheckPath: "/healthcheck",
    projectHostPath: "/path/to/app",
    projectContainerPath: "/app",
    projectExcludePaths: ["/app/node_modules", "/app/target"],
    caRootCertFile: "/path/to/rootCA.pem",
    coursierCacheDir: "/path/to/cache/coursier",
    ivyCacheDir: "/path/to/cache/ivy",
    npmCacheDir: "/path/to/cache/npm",
    aptCacheDir: "/path/to/cache/apt",
  })
    .withNetwork(network)
    .withNetworkAliases("app")
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

Omit `image` to use the image tag embedded in the installed package,
or supply an explicit image reference to override it.
The image has no start command, so the caller supplies one,
along with any backing services the application needs on the network.

| Option | Required | Description |
| --- | --- | --- |
| `image` | No | Image reference; defaults to the tag embedded in the package. |
| `name` | Yes | Name of the application. |
| `exposedPorts` | Yes | Ports to expose from the container. |
| `healthCheckPort` | Yes | Port polled for readiness. |
| `healthCheckPath` | Yes | HTTP path polled for readiness; must return 200. |
| `projectHostPath` | Yes | Project root on the host, bind-mounted read-write. |
| `projectContainerPath` | Yes | Mount target for the project root and the container's working directory. Must contain `.tool-versions`. |
| `projectExcludePaths` | No | Absolute container paths masked with empty tmpfs mounts, so host build output (e.g. `node_modules`, `target`) is not shared with the container. |
| `caRootCertFile` | No | Host path to a local CA `rootCA.pem`. It is copied into the container and installed with `mkcert -install` at startup. |
| `coursierCacheDir` | No | Host directory bind-mounted at `/root/.cache/coursier/v1`. |
| `ivyCacheDir` | No | Host directory bind-mounted at `/root/.ivy2/cache`. |
| `npmCacheDir` | No | Host directory bind-mounted at `/root/.npm/_cacache`. |
| `aptCacheDir` | No | Host directory bind-mounted at `/var/cache/apt/archives`. |

The cache directories persist downloads between runs to speed up startup.

`ApplicationContainer` extends `GenericContainer`, so network, environment,
bind mounts, log consumers, and other Testcontainers options remain available.
Bind mounts passed to `.withBindMounts()` are added alongside the project and
cache mounts; as in Testcontainers, each call replaces the extra mounts from any
previous call, so pass them all in one call.

`ApplicationContainer` pulls the specified image rather than building it,
exposes the given ports, and waits up to ten minutes for HTTP 200 from the
given health-check path and port.

