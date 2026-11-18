import { GenericContainer, Wait } from "testcontainers";
import { createLogConsumer } from "./LogConsumer";

export type ApplicationContainerOptions = {
  image: string;
  name: string;
  exposedPorts: number[];
  healthCheckPort: number;
  healthCheckPath: string;
  streamLogs?: boolean;
};

export class ApplicationContainer extends GenericContainer {
  constructor(
    { image, name, exposedPorts, healthCheckPort, healthCheckPath, streamLogs }: ApplicationContainerOptions,
  ) {
    if (!image.trim()) {
      throw new Error("A published application image reference is required");
    }

    super(image);
    this.withExposedPorts(...exposedPorts)
      // Allows for compiling the application on first start.
      .withLogConsumer(createLogConsumer(name, !!streamLogs))
      .withStartupTimeout(10 * 60 * 1000)
      .withWaitStrategy(
        Wait.forHttp(healthCheckPath, healthCheckPort).forStatusCode(200),
      );
  }
}