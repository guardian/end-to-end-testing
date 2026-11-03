import { GenericContainer, Wait } from "testcontainers";

export type ApplicationContainerOptions = {
  port: number;
  healthCheckPath: string;
};

export class ApplicationContainer extends GenericContainer {
  constructor(
    image: string,
    { port, healthCheckPath }: ApplicationContainerOptions,
  ) {
    if (!image.trim()) {
      throw new Error("A published application image reference is required");
    }

    super(image);
    this.withExposedPorts(port);
    // Allows for compiling the application on first start.
    this.withStartupTimeout(10 * 60 * 1000);
    this.withWaitStrategy(
      Wait.forHttp(healthCheckPath, port).forStatusCode(200),
    );
  }
}