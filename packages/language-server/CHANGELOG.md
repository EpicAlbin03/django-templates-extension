# Changelog

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
