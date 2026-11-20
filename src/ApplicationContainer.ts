import { GenericContainer, PortWithOptionalBinding, Wait } from "testcontainers";

export type ApplicationContainerOptions = {
  image?: string;
  name: string;
  exposedPorts: PortWithOptionalBinding[];
  healthCheckPort: number;
  healthCheckPath: string;
};

export class ApplicationContainer extends GenericContainer {
  constructor(
    {
      image = `ghcr.io/guardian/end-to-end-testing/application:${process.env.APPLICATION_IMAGE_TAG}`,
      exposedPorts, healthCheckPort, healthCheckPath,
    }: ApplicationContainerOptions,
  ) {
    if (!image || !image.trim()) {
      throw new Error("A published application image reference is required");
    }

    super(image);
    this.withExposedPorts(...exposedPorts)
      // Allows for compiling the application on first start.
      .withStartupTimeout(10 * 60 * 1000)
      .withWaitStrategy(
        Wait.forHttp(healthCheckPath, healthCheckPort).forStatusCode(200),
      );
  }
}