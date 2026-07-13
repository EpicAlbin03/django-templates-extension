import { createHash } from "node:crypto";
import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { x as extractTar } from "tar";
import yauzl from "yauzl";

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const languageServerDirectory = join(repositoryRoot, "packages", "language-server");
const extensionDirectory = join(repositoryRoot, "packages", "django-vscode");
const requiredLanguageServerFiles = ["bin/server.js", "dist/index.mjs", "dist/index.d.mts"];
const requiredExtensionFiles = [
  "dist/extension.cjs",
  "package.json",
  "syntaxes/django-injection.tmLanguage.json",
  "snippets/tags.json",
  "snippets/filters.json",
  "img/logo.png",
  "packaging-metadata.json",
  "node_modules/django-template-language-server/bin/server.js",
  "node_modules/django-template-language-server/dist/index.mjs",
  "node_modules/django-template-language-server/dist/index.d.mts",
];

function commandName(name) {
  return name;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.error?.message,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result.stdout;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assertFilesExist(root, paths, description) {
  const missing = paths.filter((path) => !existsSync(join(root, path)));
  if (missing.length > 0) {
    throw new Error(`${description} is missing: ${missing.join(", ")}`);
  }
}

function npmPack({ dryRun, destination }) {
  const args = ["pack", "--json", "--ignore-scripts"];
  if (dryRun) {
    args.push("--dry-run");
  }
  if (destination) {
    args.push("--pack-destination", destination);
  }
  const result = JSON.parse(run(commandName("npm"), args, { cwd: languageServerDirectory }));
  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error("npm pack returned an unexpected result.");
  }
  return result[0];
}

export function verifyLanguageServerDryRun() {
  const packageManifest = readJson(join(languageServerDirectory, "package.json"));
  const result = npmPack({ dryRun: true });
  const files = new Set(result.files.map((file) => file.path));
  for (const requiredFile of requiredLanguageServerFiles) {
    if (!files.has(requiredFile)) {
      throw new Error(`Language-server package is missing ${requiredFile}.`);
    }
  }
  if (result.name !== packageManifest.name || result.version !== packageManifest.version) {
    throw new Error("Language-server dry-run metadata does not match its package manifest.");
  }
  return { files: [...files], name: result.name, version: result.version };
}

function findPackageDirectory(packageName, resolveFrom) {
  const packageRequire = createRequire(join(resolveFrom, "package.json"));
  let current = dirname(packageRequire.resolve(packageName));
  while (current !== dirname(current)) {
    const manifestPath = join(current, "package.json");
    if (existsSync(manifestPath) && readJson(manifestPath).name === packageName) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error(`Could not locate package root for ${packageName}.`);
}

function installManifestDependencies(manifest, resolveFrom, packageDirectory, ancestry) {
  const requiredDependencies = Object.keys(manifest.dependencies ?? {});
  const optionalDependencies = new Set(Object.keys(manifest.optionalDependencies ?? {}));
  for (const dependency of [...requiredDependencies, ...optionalDependencies]) {
    try {
      installDependency(dependency, resolveFrom, join(packageDirectory, "node_modules"), ancestry);
    } catch (error) {
      if (!optionalDependencies.has(dependency)) {
        throw error;
      }
    }
  }
}

function installDependency(packageName, resolveFrom, targetNodeModules, ancestry) {
  const sourceDirectory = findPackageDirectory(packageName, resolveFrom);
  if (ancestry.has(sourceDirectory)) {
    return;
  }

  const destination = join(targetNodeModules, ...packageName.split("/"));
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(sourceDirectory, destination, {
    recursive: true,
    filter(source) {
      return source !== join(sourceDirectory, "node_modules");
    },
  });

  const manifest = readJson(join(sourceDirectory, "package.json"));
  installManifestDependencies(
    manifest,
    sourceDirectory,
    destination,
    new Set([...ancestry, sourceDirectory]),
  );
}

async function stageExtension({ extensionVersion, revision, workDirectory }) {
  const tarballDirectory = join(workDirectory, "tarball");
  const stageDirectory = join(workDirectory, "extension");
  const extractedTarballDirectory = join(workDirectory, "language-server-tarball");
  mkdirSync(tarballDirectory, { recursive: true });
  mkdirSync(extractedTarballDirectory, { recursive: true });

  const packResult = npmPack({ dryRun: false, destination: tarballDirectory });
  const tarballPath = join(tarballDirectory, packResult.filename);

  cpSync(extensionDirectory, stageDirectory, {
    recursive: true,
    filter(source) {
      return source !== join(extensionDirectory, "node_modules");
    },
  });

  const languageServerManifest = readJson(join(languageServerDirectory, "package.json"));
  const extensionManifestPath = join(stageDirectory, "package.json");
  const extensionManifest = readJson(extensionManifestPath);
  extensionManifest.version = extensionVersion;
  extensionManifest.dependencies[languageServerManifest.name] = languageServerManifest.version;
  delete extensionManifest.devDependencies;
  delete extensionManifest.scripts["vscode:prepublish"];
  writeJson(extensionManifestPath, extensionManifest);

  // Stage the exact lifecycle-disabled server tarball and the frozen installed dependency tree.
  const installedDirectory = join(stageDirectory, "node_modules", languageServerManifest.name);
  await new Promise((resolveExtraction, rejectExtraction) => {
    void extractTar({ file: tarballPath, cwd: extractedTarballDirectory, sync: false }, (error) =>
      error ? rejectExtraction(error) : resolveExtraction(),
    );
  });
  cpSync(join(extractedTarballDirectory, "package"), installedDirectory, { recursive: true });
  installManifestDependencies(
    languageServerManifest,
    languageServerDirectory,
    installedDirectory,
    new Set([languageServerDirectory]),
  );
  for (const dependency of Object.keys(extensionManifest.dependencies)) {
    if (dependency !== languageServerManifest.name) {
      installDependency(
        dependency,
        extensionDirectory,
        join(stageDirectory, "node_modules"),
        new Set(),
      );
    }
  }

  assertFilesExist(installedDirectory, requiredLanguageServerFiles, "Installed language server");
  const installedManifest = readJson(join(installedDirectory, "package.json"));
  if (installedManifest.name !== languageServerManifest.name) {
    throw new Error("Installed language-server package name does not match the workspace package.");
  }
  if (installedManifest.version !== languageServerManifest.version) {
    throw new Error(
      "Installed language-server package version does not match the workspace package.",
    );
  }

  const workspaceChecksum = sha256(join(languageServerDirectory, "dist", "index.mjs"));
  const installedChecksum = sha256(join(installedDirectory, "dist", "index.mjs"));
  if (workspaceChecksum !== installedChecksum) {
    throw new Error("Installed language-server build checksum does not match the workspace build.");
  }

  writeJson(join(stageDirectory, "packaging-metadata.json"), {
    repositoryRevision: revision,
    languageServer: {
      name: languageServerManifest.name,
      version: languageServerManifest.version,
      distSha256: workspaceChecksum,
    },
  });

  return { stageDirectory, workspaceChecksum };
}

export async function smokeStartLanguageServer(serverDirectory) {
  const serverPath = join(serverDirectory, "bin", "server.js");
  const child = spawn(process.execPath, [serverPath, "--stdio"], {
    cwd: serverDirectory,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = Buffer.alloc(0);
  let stderr = "";
  let nextId = 1;
  const responses = new Map();

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdout.on("data", (chunk) => {
    stdout = Buffer.concat([stdout, chunk]);
    while (true) {
      const headerEnd = stdout.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = stdout.subarray(0, headerEnd).toString("ascii");
      const match = /Content-Length: (\d+)/i.exec(header);
      if (!match) throw new Error(`Invalid LSP response header: ${header}`);
      const length = Number(match[1]);
      const messageEnd = headerEnd + 4 + length;
      if (stdout.length < messageEnd) return;
      const message = JSON.parse(stdout.subarray(headerEnd + 4, messageEnd).toString("utf8"));
      stdout = stdout.subarray(messageEnd);
      if (message.id !== undefined) {
        responses.get(message.id)?.(message);
        responses.delete(message.id);
      }
    }
  });

  const send = (message) => {
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }));
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    child.stdin.write(body);
  };
  const request = (method, params) => {
    const id = nextId++;
    return new Promise((resolveResponse, rejectResponse) => {
      const timer = setTimeout(
        () =>
          rejectResponse(new Error(`Timed out waiting for ${method}. Server stderr: ${stderr}`)),
        10_000,
      );
      responses.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) rejectResponse(new Error(JSON.stringify(message.error)));
        else resolveResponse(message.result);
      });
      send({ id, method, params });
    });
  };

  try {
    const initializeResult = await request("initialize", {
      processId: null,
      rootUri: null,
      capabilities: {},
      initializationOptions: {
        isTrusted: false,
        handledCapabilities: { documentFormattingProvider: false },
        configuration: { django: {}, prettier: {} },
      },
    });
    if (!initializeResult?.capabilities?.completionProvider) {
      throw new Error("Packaged language server returned invalid initialize capabilities.");
    }
    await request("shutdown");
    send({ method: "exit" });
    await new Promise((resolveExit, rejectExit) => {
      const timer = setTimeout(
        () => rejectExit(new Error("Packaged language server did not exit.")),
        10_000,
      );
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolveExit();
        else rejectExit(new Error(`Packaged language server exited with ${code}: ${stderr}`));
      });
    });
  } finally {
    if (child.exitCode === null) child.kill();
  }
}

async function extractVsix(vsixPath, destination) {
  return new Promise((resolveEntries, rejectEntries) => {
    yauzl.open(vsixPath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        rejectEntries(openError ?? new Error("Could not open the VSIX archive."));
        return;
      }

      const entries = new Set();
      const fail = (error) => {
        zipFile.close();
        rejectEntries(error);
      };
      zipFile.on("error", fail);
      zipFile.on("end", () => resolveEntries(entries));
      zipFile.on("entry", (entry) => {
        const entryPath = entry.fileName.replaceAll("\\", "/");
        if (entryPath.startsWith("/") || entryPath.split("/").some((segment) => segment === "..")) {
          fail(new Error(`Unsafe VSIX entry path: ${entry.fileName}`));
          return;
        }
        entries.add(entryPath);
        const outputPath = join(destination, ...entryPath.split("/"));
        if (entryPath.endsWith("/")) {
          mkdirSync(outputPath, { recursive: true });
          zipFile.readEntry();
          return;
        }

        mkdirSync(dirname(outputPath), { recursive: true });
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            fail(streamError ?? new Error(`Could not read VSIX entry ${entry.fileName}.`));
            return;
          }
          void pipeline(stream, createWriteStream(outputPath)).then(
            () => zipFile.readEntry(),
            fail,
          );
        });
      });
      zipFile.readEntry();
    });
  });
}

export async function packageExtension({
  extensionVersion,
  revision,
  outputPath,
  workDirectory = mkdtempSync(join(tmpdir(), "django-extension-package-")),
  build = true,
}) {
  if (!extensionVersion || !revision || !outputPath) {
    throw new Error("extensionVersion, revision, and outputPath are required.");
  }
  workDirectory = resolve(workDirectory);
  rmSync(workDirectory, { recursive: true, force: true });
  mkdirSync(workDirectory, { recursive: true });

  if (build) {
    // Avoid the cached task runner here because packaging can run inside the coverage process.
    run(commandName("vp"), ["pack"], { cwd: languageServerDirectory });
    run(commandName("vp"), ["pack"], { cwd: extensionDirectory });
  }
  const dryRun = verifyLanguageServerDryRun();
  const staged = await stageExtension({ extensionVersion, revision, workDirectory });

  const vsce = require.resolve("@vscode/vsce/vsce");
  const listedFiles = new Set(
    run(process.execPath, [vsce, "ls"], { cwd: staged.stageDirectory })
      .split(/\r?\n/)
      .map((path) => path.trim().replaceAll("\\", "/"))
      .filter(Boolean),
  );
  for (const requiredFile of requiredExtensionFiles) {
    if (!listedFiles.has(requiredFile)) {
      throw new Error(`VSIX file listing does not include ${requiredFile}.`);
    }
  }
  const listing = run(process.execPath, [vsce, "ls", "--tree"], {
    cwd: staged.stageDirectory,
  });
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  run(process.execPath, [vsce, "package", "--out", resolve(outputPath)], {
    cwd: staged.stageDirectory,
  });
  if (!existsSync(resolve(outputPath))) {
    throw new Error("VSCE did not create the expected VSIX.");
  }

  const extractedVsixDirectory = join(workDirectory, "vsix");
  const archiveEntries = await extractVsix(resolve(outputPath), extractedVsixDirectory);
  for (const requiredFile of requiredExtensionFiles) {
    if (!archiveEntries.has(`extension/${requiredFile}`)) {
      throw new Error(`Built VSIX does not include extension/${requiredFile}.`);
    }
  }
  await smokeStartLanguageServer(
    join(extractedVsixDirectory, "extension", "node_modules", "django-template-language-server"),
  );

  return {
    dryRun,
    outputPath: resolve(outputPath),
    stageDirectory: staged.stageDirectory,
    languageServerChecksum: staged.workspaceChecksum,
    listing,
  };
}

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument: ${key ?? "<missing>"}`);
    }
    values[key.slice(2)] = value;
  }
  return values;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const result = await packageExtension({
    extensionVersion: args.version,
    revision: args.revision,
    outputPath: args.out,
    workDirectory: args["work-dir"],
  });
  console.log(
    `Created ${relative(repositoryRoot, result.outputPath)} with language-server SHA-256 ${result.languageServerChecksum}.`,
  );
}
