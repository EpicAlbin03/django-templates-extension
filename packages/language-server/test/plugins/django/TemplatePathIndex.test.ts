import * as assert from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "vite-plus/test";
import { TemplatePathIndex } from "../../../src/plugins/django/TemplatePathIndex.js";

function temporaryWorkspace(): string {
  return mkdtempSync(join(tmpdir(), "django-template-index-"));
}

function createFile(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, "contents are never needed by the index");
}

function names(result: Awaited<ReturnType<TemplatePathIndex["getCandidates"]>>): string[] {
  return result.candidates.map((candidate) => candidate.name);
}

describe("TemplatePathIndex", () => {
  it("discovers project and app template roots, skips generated trees, and includes non-HTML files", async () => {
    const workspace = temporaryWorkspace();
    try {
      createFile(join(workspace, "templates", "base.html"));
      createFile(join(workspace, "blog", "templates", "blog", "card.html"));
      createFile(join(workspace, "blog", "templates", "emails", "welcome.txt"));
      createFile(join(workspace, "node_modules", "package", "templates", "ignored.html"));
      createFile(join(workspace, "coverage", "templates", "ignored.txt"));

      const index = new TemplatePathIndex({ workspaceFolders: [workspace] });
      const result = await index.getCandidates(join(workspace, "blog", "views.py"), "");

      assert.deepStrictEqual(names(result), ["base.html", "blog/card.html", "emails/welcome.txt"]);
      assert.strictEqual(result.isIncomplete, false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("uses explicit roots, supports backslash configuration, and can disable auto-discovery", async () => {
    const workspace = temporaryWorkspace();
    try {
      createFile(join(workspace, "templates", "automatic.html"));
      createFile(join(workspace, "theme", "templates", "layouts", "base.jinja"));

      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        settings: { autoDiscover: false, roots: ["theme\\templates"] },
      });

      assert.deepStrictEqual(
        names(await index.getCandidates(join(workspace, "page.html"), "layouts/")),
        ["layouts/base.jinja"],
      );
      assert.deepStrictEqual(names(await index.getCandidates(null, "automatic")), []);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("scopes watcher patterns to conventional and accepted explicit roots", () => {
    const parent = temporaryWorkspace();
    const workspace = join(parent, "workspace");
    const external = join(parent, "external");
    try {
      mkdirSync(workspace, { recursive: true });
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        isTrusted: false,
        settings: { autoDiscover: true, roots: ["extra", external] },
      });

      assert.deepStrictEqual(index.getWatchPatterns(), [
        { baseUri: pathToFileURL(workspace).toString(), pattern: "**/templates/**" },
        { baseUri: pathToFileURL(join(workspace, "extra")).toString(), pattern: "**/*" },
      ]);
      index.configure({ settings: { autoDiscover: false, roots: [] } });
      assert.deepStrictEqual(index.getWatchPatterns(), []);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("deduplicates logical names, sorts them, bounds results, and reports incompleteness", async () => {
    const workspace = temporaryWorkspace();
    try {
      createFile(join(workspace, "templates", "same.html"));
      createFile(join(workspace, "app", "templates", "same.html"));
      createFile(join(workspace, "templates", "prefix", "c.html"));
      createFile(join(workspace, "templates", "prefix", "a.html"));
      createFile(join(workspace, "templates", "prefix", "b.html"));

      const index = new TemplatePathIndex({ workspaceFolders: [workspace], limit: 2 });
      const prefixed = await index.getCandidates(null, "prefix/");

      assert.deepStrictEqual(names(prefixed), ["prefix/a.html", "prefix/b.html"]);
      assert.strictEqual(prefixed.isIncomplete, true);
      const duplicate = await index.getCandidates(null, "same");
      assert.deepStrictEqual(names(duplicate), ["same.html"]);
      assert.strictEqual(duplicate.isIncomplete, false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("selects the containing workspace and returns a union when no workspace contains the document", async () => {
    const parent = temporaryWorkspace();
    const first = join(parent, "first");
    const second = join(parent, "second");
    try {
      createFile(join(first, "templates", "first.html"));
      createFile(join(second, "templates", "second.html"));
      const index = new TemplatePathIndex({ workspaceFolders: [first, second] });

      assert.deepStrictEqual(
        names(await index.getCandidates(join(first, "templates", "page.html"), "")),
        ["first.html"],
      );
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), [
        "first.html",
        "second.html",
      ]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("accepts absolute and escaping roots only in trusted workspaces", async () => {
    const parent = temporaryWorkspace();
    const workspace = join(parent, "workspace");
    const external = join(parent, "external");
    try {
      mkdirSync(workspace, { recursive: true });
      createFile(join(external, "outside.html"));
      const relativeEscape = relative(workspace, external);

      const trusted = new TemplatePathIndex({
        workspaceFolders: [workspace],
        isTrusted: true,
        settings: { autoDiscover: false, roots: [external, relativeEscape] },
      });
      const untrusted = new TemplatePathIndex({
        workspaceFolders: [workspace],
        isTrusted: false,
        settings: { autoDiscover: false, roots: [external, relativeEscape] },
      });

      assert.deepStrictEqual(names(await trusted.getCandidates(null, "")), ["outside.html"]);
      assert.deepStrictEqual(names(await untrusted.getCandidates(null, "")), []);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("rejects an untrusted configured root reached through an intermediate symlink", async () => {
    const parent = temporaryWorkspace();
    const workspace = join(parent, "workspace");
    const external = join(parent, "external");
    try {
      createFile(join(external, "templates", "secret.html"));
      mkdirSync(workspace, { recursive: true });
      try {
        symlinkSync(external, join(workspace, "linked"), "junction");
      } catch {
        return;
      }

      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        isTrusted: false,
        settings: { autoDiscover: false, roots: ["linked/templates"] },
      });
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), []);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("does not follow symlinked directories", async () => {
    const parent = temporaryWorkspace();
    const workspace = join(parent, "workspace");
    const external = join(parent, "external");
    try {
      createFile(join(external, "secret.html"));
      mkdirSync(join(workspace, "templates"), { recursive: true });
      try {
        symlinkSync(external, join(workspace, "templates", "linked"), "junction");
      } catch {
        return;
      }

      const index = new TemplatePathIndex({ workspaceFolders: [workspace] });
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), []);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("rejects incremental create events reached through a symlinked directory", async () => {
    const parent = temporaryWorkspace();
    const workspace = join(parent, "workspace");
    const external = join(parent, "external");
    try {
      createFile(join(workspace, "templates", "base.html"));
      mkdirSync(external, { recursive: true });
      try {
        symlinkSync(external, join(workspace, "templates", "linked"), "junction");
      } catch {
        return;
      }
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        isTrusted: false,
      });
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), ["base.html"]);

      const externalFile = join(external, "secret.txt");
      const linkedFile = join(workspace, "templates", "linked", "secret.txt");
      createFile(externalFile);
      await index.applyFileEvents([{ uri: pathToFileURL(linkedFile).toString(), type: 1 }]);
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), ["base.html"]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("coalesces concurrent scans, reuses the cache, and expires lazily", async () => {
    const workspace = temporaryWorkspace();
    let now = 1_000;
    let scans = 0;
    try {
      createFile(join(workspace, "templates", "base.html"));
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        cacheTtlMs: 100,
        now: () => now,
        async scanWorkspace(_folder, scan) {
          scans++;
          return scan();
        },
      });

      await Promise.all([
        index.getCandidates(null, ""),
        index.getCandidates(null, "b"),
        index.getCandidates(null, "base"),
      ]);
      await index.getCandidates(null, "");
      assert.strictEqual(scans, 1);

      index.configure({ settings: { autoDiscover: true, roots: [] } });
      await index.getCandidates(null, "");
      assert.strictEqual(scans, 1);

      now += 101;
      await index.getCandidates(null, "");
      assert.strictEqual(scans, 2);

      index.setRequestDrivenExpiry(false);
      now += 101;
      await index.getCandidates(null, "");
      assert.strictEqual(scans, 2);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("applies create, delete, and rename event batches without rescanning", async () => {
    const workspace = temporaryWorkspace();
    let scans = 0;
    try {
      const oldPath = join(workspace, "templates", "old.html");
      const createdPath = join(workspace, "templates", "created.html");
      const renamedPath = join(workspace, "templates", "renamed.html");
      createFile(oldPath);
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        async scanWorkspace(_folder, scan) {
          scans++;
          return scan();
        },
      });
      await index.getCandidates(null, "");

      createFile(createdPath);
      await index.applyFileEvents([{ uri: pathToFileURL(createdPath).toString(), type: 1 }]);
      unlinkSync(oldPath);
      await index.applyFileEvents([{ uri: pathToFileURL(oldPath).toString(), type: 3 }]);
      createFile(renamedPath);
      unlinkSync(createdPath);
      await index.applyFileEvents([
        { uri: pathToFileURL(createdPath).toString(), type: 3 },
        { uri: pathToFileURL(renamedPath).toString(), type: 1 },
        { uri: pathToFileURL(renamedPath).toString(), type: 2 },
      ]);

      assert.deepStrictEqual(names(await index.getCandidates(null, "")), ["renamed.html"]);
      assert.strictEqual(scans, 1);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("activates a configured root created after the initial scan", async () => {
    const workspace = temporaryWorkspace();
    try {
      const root = join(workspace, "theme");
      const createdPath = join(root, "new.txt");
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        settings: { autoDiscover: false, roots: ["theme"] },
      });
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), []);

      createFile(createdPath);
      await index.applyFileEvents([{ uri: pathToFileURL(createdPath).toString(), type: 1 }]);
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), ["new.txt"]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("keeps incremental creates consistent across overlapping roots", async () => {
    const workspace = temporaryWorkspace();
    try {
      const nestedRoot = join(workspace, "templates", "nested");
      createFile(join(nestedRoot, "initial.html"));
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        settings: { autoDiscover: true, roots: ["templates/nested"] },
      });
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), [
        "initial.html",
        "nested/initial.html",
      ]);

      const addedPath = join(nestedRoot, "added.html");
      createFile(addedPath);
      await index.applyFileEvents([{ uri: pathToFileURL(addedPath).toString(), type: 1 }]);
      assert.deepStrictEqual(names(await index.getCandidates(null, "")), [
        "added.html",
        "initial.html",
        "nested/added.html",
        "nested/initial.html",
      ]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("marks ambiguous directory changes dirty and prevents a stale scan from winning a race", async () => {
    const workspace = temporaryWorkspace();
    let scans = 0;
    let releaseFirstScan!: () => void;
    let markFirstScanReady!: () => void;
    const firstScanReady = new Promise<void>((resolve) => {
      markFirstScanReady = resolve;
    });
    const firstScanPause = new Promise<void>((resolve) => {
      releaseFirstScan = resolve;
    });
    try {
      createFile(join(workspace, "templates", "before.html"));
      const index = new TemplatePathIndex({
        workspaceFolders: [workspace],
        async scanWorkspace(_folder, scan) {
          scans++;
          if (scans === 1) {
            const stale = await scan();
            markFirstScanReady();
            await firstScanPause;
            return stale;
          }
          return scan();
        },
      });

      const firstQuery = index.getCandidates(null, "");
      await firstScanReady;
      const newDirectory = join(workspace, "templates", "new");
      mkdirSync(newDirectory);
      await index.applyFileEvents([{ uri: pathToFileURL(newDirectory).toString(), type: 1 }]);
      createFile(join(newDirectory, "after.html"));
      releaseFirstScan();

      assert.deepStrictEqual(names(await firstQuery), ["before.html", "new/after.html"]);
      assert.strictEqual(scans, 2);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
