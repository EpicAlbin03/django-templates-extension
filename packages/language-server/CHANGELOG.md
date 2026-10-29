# Changelog

## 0.1.3

### Patch Changes

- [#8](https://github.com/EpicAlbin03/django-templates-extension/pull/8) [`b552f35`](https://github.com/EpicAlbin03/django-templates-extension/commit/b552f35970220f730ba7e3106546bd9c23eb0d13) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - fix: prevent tabWidth and useTabs from being overridden by editor formatting requests

## 0.1.2

### Patch Changes

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`954aab2`](https://github.com/EpicAlbin03/django-templates-extension/commit/954aab216adf862fc0540e04f69eb51e560ca6d7) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Replace the complete template path when accepting a completion in the middle of a quoted path, preserving the surrounding quotes and template tag delimiters.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`954aab2`](https://github.com/EpicAlbin03/django-templates-extension/commit/954aab216adf862fc0540e04f69eb51e560ca6d7) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Resolve relative formatter ignore files from each document's directory and ancestors instead of the language server's working directory.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`954aab2`](https://github.com/EpicAlbin03/django-templates-extension/commit/954aab216adf862fc0540e04f69eb51e560ca6d7) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Format plain HTML and untitled documents without requiring Django template tags. Use only bundled formatter dependencies and editor options for untitled documents, without discovering project configuration or plugins.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`ce4fd34`](https://github.com/EpicAlbin03/django-templates-extension/commit/ce4fd347e4a1ac702ae944d0e137a6343a874af1) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Load the Node entrypoint of prettier-plugin-django-templates instead of its browser build.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`954aab2`](https://github.com/EpicAlbin03/django-templates-extension/commit/954aab216adf862fc0540e04f69eb51e560ca6d7) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Refresh template indexing and file watchers when workspace folders are added or removed, and discard stale scan results when folders change during a completion request.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`ce4fd34`](https://github.com/EpicAlbin03/django-templates-extension/commit/ce4fd347e4a1ac702ae944d0e137a6343a874af1) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Use schema-based validation for initialization options, Django settings, Prettier configuration, and workspace Prettier packages while preserving safe defaults for malformed configuration. E.g. add Zod.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`ce4fd34`](https://github.com/EpicAlbin03/django-templates-extension/commit/ce4fd347e4a1ac702ae944d0e137a6343a874af1) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Write structured language-server diagnostics to stderr and let the LSP transport handle dependency console output in stdio mode to keep protocol stdout free of log messages.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`e87e94e`](https://github.com/EpicAlbin03/django-templates-extension/commit/e87e94ed9cba9252eef4e222833ccb493d493fcc) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Update prettier-plugin-django-templates to v0.3.1.

- [#6](https://github.com/EpicAlbin03/django-templates-extension/pull/6) [`954aab2`](https://github.com/EpicAlbin03/django-templates-extension/commit/954aab216adf862fc0540e04f69eb51e560ca6d7) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Watch template file changes when the workspace folder itself is named `templates`, keeping template path completions up to date.

## 0.1.1

### Patch Changes

- [#4](https://github.com/EpicAlbin03/django-templates-extension/pull/4) [`a296b4f`](https://github.com/EpicAlbin03/django-templates-extension/commit/a296b4fef087786318bd5cd85e00a10c294c91e1) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - update prettier to "~3.9.8" and prettier-plugin-django-templates to "~0.3.0"

## 0.1.0

### Minor Changes

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1333840`](https://github.com/EpicAlbin03/django-templates-extension/commit/13338402814dd4e91a7bba1d91a7371b2c99e3c4) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Added template-path completions, richer Django tag/filter hover documentation, formatting support, performance and bundling improvements.

### Patch Changes

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1c3c143`](https://github.com/EpicAlbin03/django-templates-extension/commit/1c3c14322c184921528792126f66c5b156dfc5dd) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Split Django tag metadata by ownership and share Markdown rendering across completion and hover output.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`0ef0436`](https://github.com/EpicAlbin03/django-templates-extension/commit/0ef04361df52a4ed4a2882d8f5f9d08b8752f35a) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Reduce language-server startup time and keep template-path discovery responsive during large workspace scans and file-event bursts.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1ec04b3`](https://github.com/EpicAlbin03/django-templates-extension/commit/1ec04b3ec0dd345dcf71cf3fc6425f254a0c2d70) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Propagate genuine formatter failures as stable LSP errors while keeping expected no-op formatting silent.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1f9e67e`](https://github.com/EpicAlbin03/django-templates-extension/commit/1f9e67e266e37f152a465e84e27691ce6bb41bcb) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Bundle language-server protocol dependencies so the VS Code extension can ship a smaller, self-contained server runtime.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`7fda4ad`](https://github.com/EpicAlbin03/django-templates-extension/commit/7fda4ad3a011acf811e51e12f4b9f51fe1e4e686) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - lower "@types/vscode" version to "1.104.0" to allow for installing the extension on older vscode versions

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1c3c143`](https://github.com/EpicAlbin03/django-templates-extension/commit/1c3c14322c184921528792126f66c5b156dfc5dd) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Preserve document language IDs and protocol versions while ignoring stale updates atomically.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1ec04b3`](https://github.com/EpicAlbin03/django-templates-extension/commit/1ec04b3ec0dd345dcf71cf3fc6425f254a0c2d70) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Make Prettier option precedence deterministic while keeping Django parser and plugin selection mandatory.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`0d57176`](https://github.com/EpicAlbin03/django-templates-extension/commit/0d57176478f57b83453ccafbe80430149dfd3e93) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - template-path completions

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1c3c143`](https://github.com/EpicAlbin03/django-templates-extension/commit/1c3c14322c184921528792126f66c5b156dfc5dd) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Remove unsupported completion triggers that have no provider.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1ec04b3`](https://github.com/EpicAlbin03/django-templates-extension/commit/1ec04b3ec0dd345dcf71cf3fc6425f254a0c2d70) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Use bundled formatting code and a restricted configuration allowlist in untrusted workspaces.

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`fc5bdfe`](https://github.com/EpicAlbin03/django-templates-extension/commit/fc5bdfeeb8f971d5527d570d39719ef15e5929cd) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - added tooltips for filters

- [#2](https://github.com/EpicAlbin03/django-templates-extension/pull/2) [`1ec04b3`](https://github.com/EpicAlbin03/django-templates-extension/commit/1ec04b3ec0dd345dcf71cf3fc6425f254a0c2d70) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - Validate and type language-server initialization, settings, logging, and Prettier configuration values.

## 0.0.2

### Patch Changes

- [`da81c1e`](https://github.com/EpicAlbin03/django-templates-extension/commit/da81c1e2d0a43c321acf506d31e0b461b094b351) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - updated to "prettier-plugin-django-templates": "^0.2.0"

## 0.0.1

Initial release

Features:

- Completions for Django template tags and filters
- Tooltips with examples and reference links
- Formatting with Prettier (`prettier-plugin-django-templates`)
