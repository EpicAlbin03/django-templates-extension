import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const extensionDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverDirectory = resolve(extensionDirectory, "../language-server");
const outputDirectory = resolve(extensionDirectory, "dist/server");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, "bin"), { recursive: true });
await mkdir(resolve(outputDirectory, "dist"), { recursive: true });
await Promise.all([
  copyFile(resolve(serverDirectory, "bin/server.js"), resolve(outputDirectory, "bin/server.js")),
  copyFile(resolve(serverDirectory, "dist/index.mjs"), resolve(outputDirectory, "dist/index.mjs")),
]);
