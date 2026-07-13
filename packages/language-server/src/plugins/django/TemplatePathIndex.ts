import { lstat, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isUseCaseSensitiveFileNames } from "../../lib/documents/isFileSystemCaseSensitive.js";

export const DEFAULT_TEMPLATE_PATH_LIMIT = 200;
export const DEFAULT_TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;
export const DEFAULT_TEMPLATE_SCAN_CONCURRENCY = 16;

const SORTED_NAME_BATCH_THRESHOLD = 16;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".venv",
  "venv",
  ".tox",
  ".nox",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  "dist",
  "build",
  "coverage",
]);

export interface TemplateSettings {
  autoDiscover: boolean;
  roots: string[];
}

export interface TemplateWorkspaceFolder {
  uri: string;
  path: string;
  name?: string;
}

export interface TemplatePathCandidate {
  name: string;
  sourcePath: string;
  rootPath: string;
}

export interface TemplatePathResult {
  candidates: TemplatePathCandidate[];
  isIncomplete: boolean;
}

export interface TemplatePathProvider {
  getCandidates(documentPath: string | null, prefix: string): Promise<TemplatePathResult>;
}

export interface TemplateFileEvent {
  uri: string;
  type: number;
}

export interface TemplateWatchPattern {
  baseUri: string;
  pattern: string;
}

export interface TemplatePathScanResult {
  roots: string[];
  activeRoots?: string[];
  candidates: TemplatePathCandidate[];
}

interface TemplateDirectoryEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface TemplatePathIndexOptions {
  workspaceFolders: Array<string | TemplateWorkspaceFolder>;
  isTrusted?: boolean;
  settings?: Partial<TemplateSettings>;
  limit?: number;
  cacheTtlMs?: number;
  now?: () => number;
  readDirectory?: (directory: string) => Promise<TemplateDirectoryEntry[]>;
  scanWorkspace?: (
    workspace: TemplateWorkspaceFolder,
    scan: () => Promise<TemplatePathScanResult>,
  ) => Promise<TemplatePathScanResult>;
}

type CandidateSources = Map<string, TemplatePathCandidate>;

interface WorkspaceState {
  folder: TemplateWorkspaceFolder;
  generation: number;
  dirty: boolean;
  scannedAt: number;
  roots: string[];
  activeRoots: string[];
  candidates: Map<string, CandidateSources>;
  sourceNames: Map<string, Set<string>>;
  sortedNames: string[];
  inFlight: Promise<void> | null;
}

/**
 * Lazily discovers and caches filesystem-backed Django template names.
 */
export class TemplatePathIndex implements TemplatePathProvider {
  private states: WorkspaceState[];
  private settings: TemplateSettings;
  private isTrusted: boolean;
  private readonly limit: number;
  private readonly cacheTtlMs: number;
  private readonly now: () => number;
  private readonly readDirectory: (directory: string) => Promise<TemplateDirectoryEntry[]>;
  private readonly scanWorkspaceDependency?: TemplatePathIndexOptions["scanWorkspace"];
  private useCacheExpiry = true;
  private disposed = false;
  // Watch notifications are fire-and-forget, so candidate requests synchronize through this FIFO.
  private pendingFileEvents: Promise<void> = Promise.resolve();

  constructor(options: TemplatePathIndexOptions) {
    this.states = normalizeWorkspaceFolders(options.workspaceFolders).map(createWorkspaceState);
    this.settings = normalizeTemplateSettings(options.settings);
    this.isTrusted = options.isTrusted ?? true;
    this.limit = Math.max(1, options.limit ?? DEFAULT_TEMPLATE_PATH_LIMIT);
    this.cacheTtlMs = Math.max(0, options.cacheTtlMs ?? DEFAULT_TEMPLATE_CACHE_TTL_MS);
    this.now = options.now ?? Date.now;
    this.readDirectory = limitConcurrency(
      options.readDirectory ?? readDirectory,
      DEFAULT_TEMPLATE_SCAN_CONCURRENCY,
    );
    this.scanWorkspaceDependency = options.scanWorkspace;
  }

  configure(options: {
    workspaceFolders?: Array<string | TemplateWorkspaceFolder>;
    isTrusted?: boolean;
    settings?: Partial<TemplateSettings>;
  }): void {
    let invalidate = false;
    if (options.workspaceFolders) {
      const folders = normalizeWorkspaceFolders(options.workspaceFolders);
      if (!sameWorkspaceFolders(this.states, folders)) {
        this.states = folders.map(createWorkspaceState);
        invalidate = true;
      }
    }
    if (options.isTrusted !== undefined && options.isTrusted !== this.isTrusted) {
      this.isTrusted = options.isTrusted;
      invalidate = true;
    }
    if (options.settings) {
      const settings = normalizeTemplateSettings(options.settings);
      if (!sameTemplateSettings(settings, this.settings)) {
        this.settings = settings;
        invalidate = true;
      }
    }

    if (invalidate) {
      for (const state of this.states) {
        state.generation++;
        state.dirty = true;
      }
    }
  }

  async getCandidates(documentPath: string | null, prefix: string): Promise<TemplatePathResult> {
    if (this.disposed) {
      return { candidates: [], isIncomplete: false };
    }

    await this.pendingFileEvents;
    if (this.disposed) {
      return { candidates: [], isIncomplete: false };
    }
    const states = this.selectStates(documentPath);
    await Promise.all(states.map((state) => this.ensureFresh(state)));

    const normalizedPrefix = prefix.replace(/\\/g, "/");
    const cursors = states.map((state) => ({
      state,
      index: lowerBound(state.sortedNames, normalizedPrefix),
    }));
    const matches: TemplatePathCandidate[] = [];

    while (matches.length <= this.limit) {
      let nextName: string | null = null;
      for (const cursor of cursors) {
        const name = cursor.state.sortedNames[cursor.index];
        if (
          name?.startsWith(normalizedPrefix) &&
          (nextName === null || comparePaths(name, nextName) < 0)
        ) {
          nextName = name;
        }
      }
      if (nextName === null) {
        break;
      }

      let candidate: TemplatePathCandidate | undefined;
      for (const cursor of cursors) {
        if (cursor.state.sortedNames[cursor.index] !== nextName) {
          continue;
        }
        candidate ??= firstSortedSource(cursor.state.candidates.get(nextName));
        cursor.index++;
      }
      if (candidate) {
        matches.push(candidate);
      }
    }

    return {
      candidates: matches.slice(0, this.limit),
      isIncomplete: matches.length > this.limit,
    };
  }

  setRequestDrivenExpiry(enabled: boolean): void {
    this.useCacheExpiry = enabled;
  }

  applyFileEvents(events: TemplateFileEvent[]): Promise<void> {
    const operation = this.pendingFileEvents.then(() => this.processFileEvents(events));
    this.pendingFileEvents = operation.catch(() => {});
    return operation;
  }

  private async processFileEvents(events: TemplateFileEvent[]): Promise<void> {
    if (this.disposed) {
      return;
    }

    const deferSortedNames = events.length >= SORTED_NAME_BATCH_THRESHOLD;
    const statesNeedingSort = new Set<WorkspaceState>();
    for (const event of events) {
      if (event.type === 2) {
        // Template contents do not affect logical template names.
        continue;
      }

      const eventPath = uriToFilePath(event.uri);
      if (!eventPath) {
        continue;
      }

      for (const state of this.states) {
        if (!this.eventCanAffectState(eventPath, state)) {
          continue;
        }
        state.generation++;

        if (state.dirty || state.scannedAt === 0) {
          continue;
        }

        let namesChanged = false;
        if (event.type === 3) {
          namesChanged = this.applyDelete(state, eventPath, deferSortedNames);
        } else if (event.type === 1) {
          namesChanged = await this.applyCreate(state, eventPath, deferSortedNames);
        }
        if (deferSortedNames && namesChanged) {
          statesNeedingSort.add(state);
        }
      }
    }

    for (const state of statesNeedingSort) {
      if (!state.dirty) {
        state.sortedNames = [...state.candidates.keys()].sort(comparePaths);
      }
    }
  }

  getWatchPatterns(): TemplateWatchPattern[] {
    const patterns: TemplateWatchPattern[] = [];
    const seen = new Set<string>();

    for (const state of this.states) {
      if (this.settings.autoDiscover) {
        addWatchPattern(patterns, seen, state.folder.uri, "**/templates/**");
      }
      for (const root of this.resolveConfiguredRoots(state.folder)) {
        addWatchPattern(patterns, seen, pathToFileURL(root).toString(), "**/*");
      }
    }

    return patterns;
  }

  dispose(): void {
    this.disposed = true;
    for (const state of this.states) {
      state.candidates.clear();
      state.sourceNames.clear();
      state.sortedNames = [];
      state.roots = [];
      state.activeRoots = [];
      state.dirty = true;
    }
  }

  private selectStates(documentPath: string | null): WorkspaceState[] {
    if (!documentPath) {
      return this.states;
    }

    const normalizedDocumentPath = normalizeFilePath(documentPath);
    const containing = this.states
      .filter((state) => isPathInside(normalizedDocumentPath, state.folder.path))
      .sort((left, right) => right.folder.path.length - left.folder.path.length);
    return containing.length > 0 ? [containing[0]] : this.states;
  }

  private async ensureFresh(state: WorkspaceState): Promise<void> {
    const expired =
      this.useCacheExpiry && state.scannedAt > 0 && this.now() - state.scannedAt >= this.cacheTtlMs;
    if (!state.dirty && !expired) {
      return;
    }

    if (expired) {
      state.dirty = true;
    }
    if (state.inFlight) {
      await state.inFlight;
      if (state.dirty) {
        await this.ensureFresh(state);
      }
      return;
    }

    const generation = state.generation;
    const performScan = () => this.scanState(state);
    const scanPromise = (
      this.scanWorkspaceDependency
        ? this.scanWorkspaceDependency(state.folder, performScan)
        : performScan()
    ).then((result) => {
      if (this.disposed || state.generation !== generation) {
        return;
      }
      state.roots = result.roots;
      state.activeRoots = result.activeRoots ?? result.roots;
      const indexes = candidateIndexes(result.candidates);
      state.candidates = indexes.byName;
      state.sourceNames = indexes.namesBySource;
      state.sortedNames = [...state.candidates.keys()].sort(comparePaths);
      state.scannedAt = this.now();
      state.dirty = false;
    });

    state.inFlight = scanPromise.finally(() => {
      state.inFlight = null;
    });
    await state.inFlight;
    if (state.dirty && !this.disposed) {
      await this.ensureFresh(state);
    }
  }

  private async scanState(state: WorkspaceState): Promise<TemplatePathScanResult> {
    const rootPaths = new Set<string>();
    if (this.settings.autoDiscover) {
      for (const root of await discoverConventionalRoots(state.folder.path, this.readDirectory)) {
        rootPaths.add(root);
      }
    }
    for (const root of this.resolveConfiguredRoots(state.folder)) {
      rootPaths.add(root);
    }

    const roots = [...rootPaths].sort(comparePaths);
    const candidates: TemplatePathCandidate[] = [];
    const activeRoots: string[] = [];
    const realWorkspacePath = this.isTrusted ? null : await safeRealpath(state.folder.path);
    for (let cursor = 0; cursor < roots.length; cursor += DEFAULT_TEMPLATE_SCAN_CONCURRENCY) {
      const batch = roots.slice(cursor, cursor + DEFAULT_TEMPLATE_SCAN_CONCURRENCY);
      const accepted = await Promise.all(
        batch.map(async (root) => {
          const rootInfo = await safeLstat(root);
          if (!rootInfo?.isDirectory() || rootInfo.isSymbolicLink()) {
            return false;
          }
          if (
            isPathInside(root, state.folder.path) &&
            !(await isPathReachableWithoutSymlink(state.folder.path, root))
          ) {
            return false;
          }
          if (!this.isTrusted) {
            const realRootPath = await safeRealpath(root);
            if (
              !realRootPath ||
              !realWorkspacePath ||
              !isPathInside(realRootPath, realWorkspacePath)
            ) {
              return false;
            }
          }
          return true;
        }),
      );
      for (let index = 0; index < batch.length; index++) {
        if (accepted[index]) {
          activeRoots.push(batch[index]);
        }
      }
    }
    await scanTemplateRoots(activeRoots, candidates, this.readDirectory);

    return { roots, activeRoots, candidates };
  }

  private resolveConfiguredRoots(folder: TemplateWorkspaceFolder): string[] {
    const roots: string[] = [];
    for (const configuredRoot of this.settings.roots) {
      const portableRoot = configuredRoot.replace(/[\\/]/g, sep);
      if (isAbsolute(portableRoot)) {
        if (this.isTrusted) {
          roots.push(normalizeFilePath(portableRoot));
        }
        continue;
      }

      const resolvedRoot = normalizeFilePath(resolve(folder.path, portableRoot));
      if (this.isTrusted || isPathInside(resolvedRoot, folder.path)) {
        roots.push(resolvedRoot);
      }
    }
    return [...new Set(roots)];
  }

  private eventCanAffectState(eventPath: string, state: WorkspaceState): boolean {
    if (isPathInside(eventPath, state.folder.path)) {
      return true;
    }
    return state.roots.some(
      (root) => isPathInside(eventPath, root) || isPathInside(root, eventPath),
    );
  }

  private applyDelete(
    state: WorkspaceState,
    deletedPath: string,
    deferSortedNames: boolean,
  ): boolean {
    let namesChanged = false;
    const sourceKey = canonicalSourcePath(deletedPath);
    const exactNames = state.sourceNames.get(sourceKey);
    if (exactNames) {
      for (const name of exactNames) {
        const sources = state.candidates.get(name);
        sources?.delete(sourceKey);
        if (sources?.size === 0) {
          state.candidates.delete(name);
          namesChanged = true;
          if (!deferSortedNames) {
            removeSortedName(state.sortedNames, name);
          }
        }
      }
      state.sourceNames.delete(sourceKey);
    }

    const changesRootTopology = state.roots.some(
      (root) => root === deletedPath || isPathInside(root, deletedPath),
    );
    if ((!exactNames && this.isInsideKnownRoot(state, deletedPath)) || changesRootTopology) {
      state.dirty = true;
    }
    return namesChanged;
  }

  private async applyCreate(
    state: WorkspaceState,
    createdPath: string,
    deferSortedNames: boolean,
  ): Promise<boolean> {
    const info = await safeLstat(createdPath);
    if (!info || info.isSymbolicLink()) {
      return false;
    }
    if (info.isDirectory()) {
      if (
        this.isInsideKnownRoot(state, createdPath) ||
        this.hasTemplatesAncestor(createdPath, state)
      ) {
        state.dirty = true;
      }
      return false;
    }
    if (!info.isFile()) {
      return false;
    }

    const sourceKey = canonicalSourcePath(createdPath);
    if (state.sourceNames.has(sourceKey)) {
      return false;
    }
    const roots = state.activeRoots.filter(
      (root) => isPathInside(createdPath, root) && createdPath !== root,
    );
    if (roots.length === 0) {
      if (
        this.isInsideKnownRoot(state, createdPath) ||
        this.hasTemplatesAncestor(createdPath, state)
      ) {
        state.dirty = true;
      }
      return false;
    }

    let namesChanged = false;
    for (const root of roots) {
      if (!(await isPathReachableWithoutSymlink(root, createdPath))) {
        continue;
      }
      const name = logicalName(root, createdPath);
      if (!name) {
        state.dirty = true;
        continue;
      }
      let sources = state.candidates.get(name);
      if (!sources) {
        sources = new Map();
        state.candidates.set(name, sources);
        namesChanged = true;
        if (!deferSortedNames) {
          insertSortedName(state.sortedNames, name);
        }
      }
      sources.set(sourceKey, { name, sourcePath: createdPath, rootPath: root });
      let sourceNames = state.sourceNames.get(sourceKey);
      if (!sourceNames) {
        sourceNames = new Set();
        state.sourceNames.set(sourceKey, sourceNames);
      }
      sourceNames.add(name);
    }
    return namesChanged;
  }

  private isInsideKnownRoot(state: WorkspaceState, filePath: string): boolean {
    return state.roots.some((root) => isPathInside(filePath, root));
  }

  private hasTemplatesAncestor(filePath: string, state: WorkspaceState): boolean {
    if (!this.settings.autoDiscover || !isPathInside(filePath, state.folder.path)) {
      return false;
    }
    const relativePath = relative(state.folder.path, filePath);
    return relativePath.split(sep).includes("templates");
  }
}

function sameWorkspaceFolders(
  states: WorkspaceState[],
  folders: TemplateWorkspaceFolder[],
): boolean {
  return (
    states.length === folders.length &&
    states.every(
      (state, index) =>
        state.folder.path === folders[index].path && state.folder.uri === folders[index].uri,
    )
  );
}

function sameTemplateSettings(left: TemplateSettings, right: TemplateSettings): boolean {
  return (
    left.autoDiscover === right.autoDiscover &&
    left.roots.length === right.roots.length &&
    left.roots.every((root, index) => root === right.roots[index])
  );
}

function createWorkspaceState(folder: TemplateWorkspaceFolder): WorkspaceState {
  return {
    folder,
    generation: 0,
    dirty: true,
    scannedAt: 0,
    roots: [],
    activeRoots: [],
    candidates: new Map(),
    sourceNames: new Map(),
    sortedNames: [],
    inFlight: null,
  };
}

function normalizeTemplateSettings(settings?: Partial<TemplateSettings>): TemplateSettings {
  return {
    autoDiscover: settings?.autoDiscover !== false,
    roots: Array.isArray(settings?.roots)
      ? settings.roots.filter((root): root is string => typeof root === "string")
      : [],
  };
}

function normalizeWorkspaceFolders(
  folders: Array<string | TemplateWorkspaceFolder>,
): TemplateWorkspaceFolder[] {
  const normalized: TemplateWorkspaceFolder[] = [];
  const seen = new Set<string>();
  for (const folder of folders) {
    try {
      const filePath = normalizeFilePath(
        typeof folder === "string"
          ? folder.startsWith("file:")
            ? fileURLToPath(folder)
            : folder
          : folder.path || fileURLToPath(folder.uri),
      );
      if (seen.has(filePath)) {
        continue;
      }
      seen.add(filePath);
      normalized.push({
        path: filePath,
        uri: typeof folder === "string" ? pathToFileURL(filePath).toString() : folder.uri,
        ...(typeof folder === "string" || !folder.name ? {} : { name: folder.name }),
      });
    } catch {
      // Non-file workspace folders cannot participate in filesystem discovery.
    }
  }
  return normalized;
}

async function discoverConventionalRoots(
  workspacePath: string,
  readDirectory: (directory: string) => Promise<TemplateDirectoryEntry[]>,
): Promise<string[]> {
  if (workspacePath.split(sep).at(-1) === "templates") {
    return [workspacePath];
  }

  const roots: string[] = [];
  await walkDirectoryQueue(
    [workspacePath],
    (directory) => directory,
    (directory, entry) => {
      if (!entry.isDirectory() || entry.isSymbolicLink() || IGNORED_DIRECTORIES.has(entry.name)) {
        return;
      }
      const childPath = normalizeFilePath(resolve(directory, entry.name));
      if (entry.name === "templates") {
        roots.push(childPath);
        return;
      }
      return childPath;
    },
    readDirectory,
  );
  return roots;
}

interface TemplateRootWork {
  rootPath: string;
  directory: string;
}

async function scanTemplateRoots(
  roots: string[],
  candidates: TemplatePathCandidate[],
  readDirectory: (directory: string) => Promise<TemplateDirectoryEntry[]>,
): Promise<void> {
  await walkDirectoryQueue<TemplateRootWork>(
    roots.map((rootPath) => ({ rootPath, directory: rootPath })),
    (work) => work.directory,
    (work, entry) => {
      const entryPath = normalizeFilePath(resolve(work.directory, entry.name));
      if (entry.isSymbolicLink()) {
        return;
      }
      if (entry.isDirectory()) {
        return IGNORED_DIRECTORIES.has(entry.name)
          ? undefined
          : { rootPath: work.rootPath, directory: entryPath };
      }
      if (entry.isFile()) {
        const name = logicalName(work.rootPath, entryPath);
        if (name) {
          candidates.push({ name, sourcePath: entryPath, rootPath: work.rootPath });
        }
      }
    },
    readDirectory,
  );
}

async function walkDirectoryQueue<Work>(
  initialWork: Work[],
  getDirectory: (work: Work) => string,
  visitEntry: (work: Work, entry: TemplateDirectoryEntry) => Work | undefined,
  readDirectory: (directory: string) => Promise<TemplateDirectoryEntry[]>,
): Promise<void> {
  const pending = [...initialWork];

  while (pending.length > 0) {
    const batchStart = Math.max(0, pending.length - DEFAULT_TEMPLATE_SCAN_CONCURRENCY);
    const batch = pending.splice(batchStart, DEFAULT_TEMPLATE_SCAN_CONCURRENCY);
    const entriesByWork = await Promise.all(
      batch.map(async (work) => ({
        work,
        entries: await safeReadDirectory(getDirectory(work), readDirectory),
      })),
    );
    for (const { work, entries } of entriesByWork) {
      for (const entry of entries) {
        const child = visitEntry(work, entry);
        if (child !== undefined) {
          pending.push(child);
        }
      }
    }
  }
}

function candidateIndexes(candidates: TemplatePathCandidate[]): {
  byName: Map<string, CandidateSources>;
  namesBySource: Map<string, Set<string>>;
} {
  const byName = new Map<string, CandidateSources>();
  const namesBySource = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    let sources = byName.get(candidate.name);
    if (!sources) {
      sources = new Map();
      byName.set(candidate.name, sources);
    }
    const sourceKey = canonicalSourcePath(candidate.sourcePath);
    sources.set(sourceKey, candidate);

    let names = namesBySource.get(sourceKey);
    if (!names) {
      names = new Set();
      namesBySource.set(sourceKey, names);
    }
    names.add(candidate.name);
  }
  return { byName, namesBySource };
}

function firstSortedSource(
  sources: CandidateSources | undefined,
): TemplatePathCandidate | undefined {
  return sources
    ? [...sources.values()].sort((left, right) =>
        comparePaths(left.sourcePath, right.sourcePath),
      )[0]
    : undefined;
}

function logicalName(rootPath: string, sourcePath: string): string | null {
  const name = relative(rootPath, sourcePath).replace(/\\/g, "/");
  return name === "" || name === ".." || name.startsWith("../") ? null : name;
}

function isPathInside(filePath: string, directory: string): boolean {
  const relativePath = relative(directory, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath))
  );
}

function normalizeFilePath(filePath: string): string {
  return resolve(filePath.replace(/[\\/]/g, sep));
}

function canonicalSourcePath(sourcePath: string): string {
  return isUseCaseSensitiveFileNames ? sourcePath : sourcePath.toLowerCase();
}

function uriToFilePath(uri: string): string | null {
  try {
    return uri.startsWith("file:") ? normalizeFilePath(fileURLToPath(uri)) : null;
  } catch {
    return null;
  }
}

function lowerBound(sortedNames: string[], value: string): number {
  let low = 0;
  let high = sortedNames.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (comparePaths(sortedNames[middle], value) < 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function insertSortedName(sortedNames: string[], name: string): void {
  sortedNames.splice(lowerBound(sortedNames, name), 0, name);
}

function removeSortedName(sortedNames: string[], name: string): void {
  const index = lowerBound(sortedNames, name);
  if (sortedNames[index] === name) {
    sortedNames.splice(index, 1);
  }
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function addWatchPattern(
  patterns: TemplateWatchPattern[],
  seen: Set<string>,
  baseUri: string,
  pattern: string,
): void {
  const key = `${baseUri}\0${pattern}`;
  if (!seen.has(key)) {
    seen.add(key);
    patterns.push({ baseUri, pattern });
  }
}

async function readDirectory(directory: string): Promise<TemplateDirectoryEntry[]> {
  return readdir(directory, { withFileTypes: true });
}

async function safeReadDirectory(
  directory: string,
  readDirectory: (directory: string) => Promise<TemplateDirectoryEntry[]>,
): Promise<TemplateDirectoryEntry[]> {
  try {
    return await readDirectory(directory);
  } catch {
    return [];
  }
}

function limitConcurrency<Arguments extends unknown[], Result>(
  operation: (...args: Arguments) => Promise<Result>,
  concurrency: number,
): (...args: Arguments) => Promise<Result> {
  let active = 0;
  const waiters: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < concurrency) {
      active++;
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  }

  function release(): void {
    const next = waiters.shift();
    if (next) {
      next();
    } else {
      active--;
    }
  }

  return async (...args) => {
    await acquire();
    try {
      return await operation(...args);
    } finally {
      release();
    }
  };
}

async function safeLstat(filePath: string) {
  try {
    return await lstat(filePath);
  } catch {
    return null;
  }
}

async function safeRealpath(filePath: string): Promise<string | null> {
  try {
    return normalizeFilePath(await realpath(filePath));
  } catch {
    return null;
  }
}

async function isPathReachableWithoutSymlink(rootPath: string, filePath: string): Promise<boolean> {
  const [realRootPath, realFilePath] = await Promise.all([
    safeRealpath(rootPath),
    safeRealpath(filePath),
  ]);
  if (!realRootPath || !realFilePath || !isPathInside(realFilePath, realRootPath)) {
    return false;
  }

  return sameRelativePath(relative(rootPath, filePath), relative(realRootPath, realFilePath));
}

function sameRelativePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const normalized = value.replace(/\\/g, "/");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return normalize(left) === normalize(right);
}
