import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

function localImageTag() {
  const dockerfile = readFileSync(new URL("./container-images/application.Dockerfile", import.meta.url));
  const fileDigest = createHash("sha256").update(dockerfile).digest();
  return `hash-${createHash("sha256").update(fileDigest).digest("hex")}`;
}

const tag = process.env.APPLICATION_IMAGE_TAG ?? localImageTag();
if (!/^(?:sha-[0-9a-f]{40}|hash-[0-9a-f]{64})$/.test(tag)) {
  throw new Error("Expected APPLICATION_IMAGE_TAG to be sha-<commit SHA> or hash-<Dockerfile hash>");
}

export default defineConfig({
  define: { "process.env.APPLICATION_IMAGE_TAG": JSON.stringify(tag) },
  build: {
    target: "node22",
    lib: { entry: "src/index.ts", formats: ["cjs"], fileName: () => "index.js" },
    rolldownOptions: { platform: "node", external: ["testcontainers"] },
  },
});