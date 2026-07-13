import * as assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vite-plus/test";
import { packageExtension } from "../tools/package-extension.mjs";

describe("release package contents", () => {
  it(
    "packs the workspace language server into a verified VSIX and smoke-starts it",
    { timeout: 120_000 },
    async () => {
      const workDirectory = mkdtempSync(join(tmpdir(), "django-package-test-"));
      const outputPath = join(workDirectory, "django-templates.vsix");

      try {
        const result = await packageExtension({
          extensionVersion: "0.0.0",
          revision: "packaging-test-revision",
          outputPath,
          workDirectory: join(workDirectory, "staging"),
        });

        assert.ok(result.dryRun.files.includes("bin/server.js"));
        assert.ok(result.dryRun.files.includes("dist/index.mjs"));
        assert.ok(result.dryRun.files.includes("dist/index.d.mts"));
        assert.match(result.listing, /django-template-language-server/);
        assert.match(result.listing, /django-injection\.tmLanguage\.json/);
        assert.match(result.listing, /filters\.json/);
        assert.match(result.listing, /tags\.json/);

        const stagedManifest = JSON.parse(
          readFileSync(join(result.stageDirectory, "package.json"), "utf8"),
        );
        assert.equal(
          stagedManifest.dependencies["django-template-language-server"],
          result.dryRun.version,
        );
        assert.notEqual(stagedManifest.dependencies["django-template-language-server"], "*");

        const stagedLanguageClient = JSON.parse(
          readFileSync(
            join(result.stageDirectory, "node_modules", "vscode-languageclient", "package.json"),
            "utf8",
          ),
        );
        const workspaceLanguageClient = JSON.parse(
          readFileSync(
            join(
              "packages",
              "django-vscode",
              "node_modules",
              "vscode-languageclient",
              "package.json",
            ),
            "utf8",
          ),
        );
        assert.equal(stagedLanguageClient.version, workspaceLanguageClient.version);

        const metadata = JSON.parse(
          readFileSync(join(result.stageDirectory, "packaging-metadata.json"), "utf8"),
        );
        assert.equal(metadata.repositoryRevision, "packaging-test-revision");
        assert.equal(metadata.languageServer.distSha256, result.languageServerChecksum);
        assert.equal(metadata.languageServer.version, result.dryRun.version);
      } finally {
        rmSync(workDirectory, { recursive: true, force: true });
      }
    },
  );
});
