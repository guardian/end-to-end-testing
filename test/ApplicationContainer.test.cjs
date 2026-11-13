const assert = require("node:assert/strict");
const { test } = require("node:test");
const { GenericContainer } = require("testcontainers");
const { ApplicationContainer } = require("../dist/index.js");

const image = "ghcr.io/example/end-to-end-testing/application:sha-1234567";
const options = { port: 9000, healthCheckPath: "/healthcheck" };

test("uses the supplied published image and port", () => {
  const container = new ApplicationContainer(image, options);

  assert.ok(container instanceof GenericContainer);
  assert.equal(container.createOpts.Image, image);
  assert.deepEqual(container.exposedPorts, [9000]);
  assert.equal(container.startupTimeoutMs, 600000);
});

test("waits for the health check on the application port", () => {
  const container = new ApplicationContainer(image, {
    port: 8080,
    healthCheckPath: "/management/healthcheck",
  });

  assert.deepEqual(container.exposedPorts, [8080]);
  assert.equal(container.waitStrategy.path, "/management/healthcheck");
  assert.equal(container.waitStrategy.port, 8080);
});

test("retains the GenericContainer configuration API", () => {
  const container = new ApplicationContainer(image, options);

  assert.equal(container.withNetworkAliases("app"), container);
  assert.equal(container.withEnvironment({ LOCAL: "true" }), container);
  assert.equal(container.withCommand(["/app/start.sh"]), container);
});

test("rejects an empty image reference", () => {
  assert.throws(
    () => new ApplicationContainer("   ", options),
    /published application image reference is required/,
  );
});
