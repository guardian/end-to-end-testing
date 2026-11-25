import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

function localImageTag() {
  const digest = createHash("sha256");
  for (const file of ["application-entrypoint.sh", "application.Dockerfile"]) {
    const contents = readFileSync(new URL(`./container-images/${file}`, import.meta.url));
    digest.update(createHash("sha256").update(contents).digest());
  }
  return `dev-${digest.digest("hex")}`;
}

const tag = process.env.APPLICATION_IMAGE_TAG ?? localImageTag();
if (!/^(?:sha-[0-9a-f]{40}|dev-[0-9a-f]{64})$/.test(tag)) {
  throw new Error("Expected APPLICATION_IMAGE_TAG to be sha-<commit SHA> or dev-<image input hash>");
}

export default defineConfig({
  define: { "process.env.APPLICATION_IMAGE_TAG": JSON.stringify(tag) },
  build: {
    target: "node22",
    ssr: true,
    lib: { entry: "src/index.ts", formats: ["cjs"], fileName: () => "index.js" },
    rolldownOptions: { external: ["testcontainers"] },
  },
});