import * as assert from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "vite-plus/test";
import { getPackageInfo, importPrettier, setIsTrusted } from "../src/importPackage.js";

const temporaryDirectories: string[] = [];

function createPrettierFixture(version: string | number | undefined, source: string): string {
  const directory = mkdtempSync(join(tmpdir(), "django-prettier-package-"));
  temporaryDirectories.push(directory);
  const packageDirectory = join(directory, "node_modules", "prettier");
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    JSON.stringify({ name: "prettier", version, main: "index.cjs" }),
  );
  writeFileSync(join(packageDirectory, "index.cjs"), source);
  setIsTrusted(true);
  return directory;
}

afterEach(() => {
  setIsTrusted(true);
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("workspace package validation", () => {
  it("loads compatible Prettier exports and version metadata", async () => {
    const directory = createPrettierFixture(
      "3.9.8",
      `module.exports = {
        format: async () => "formatted",
        resolveConfig: async () => null,
        getFileInfo: async () => ({ ignored: false, inferredParser: null }),
        getSupportInfo: async () => ({ languages: [], options: [] }),
      };`,
    );

    assert.deepStrictEqual(getPackageInfo("prettier", directory, false).version, {
      full: "3.9.8",
      major: 3,
      minor: 9,
      patch: 8,
    });
    assert.strictEqual(await importPrettier(directory).format("template"), "formatted");
  });

  it("rejects malformed package metadata", () => {
    for (const version of [undefined, 3]) {
      const directory = createPrettierFixture(version, "module.exports = {};");
      assert.throws(
        () => getPackageInfo("prettier", directory, false),
        /has an invalid package.json/,
      );
    }
  });

  it("rejects incompatible Prettier exports", () => {
    const directory = createPrettierFixture(
      "3.9.8",
      'module.exports = { format: "not callable", resolveConfig() {}, getFileInfo() {}, getSupportInfo() {} };',
    );
    assert.throws(() => importPrettier(directory), /not a compatible Prettier installation/);
  });

  it("preserves errors thrown while evaluating a workspace package", () => {
    const directory = createPrettierFixture(
      "3.9.8",
      'throw new Error("package evaluation failed");',
    );
    assert.throws(() => importPrettier(directory), /package evaluation failed/);
  });
});
