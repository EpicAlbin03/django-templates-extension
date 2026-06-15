# prettier-plugin-django-templates changelog

## 0.1.0

### Minor Changes

- [#5](https://github.com/EpicAlbin03/prettier-plugin-django-templates/pull/5) [`74a00bf`](https://github.com/EpicAlbin03/prettier-plugin-django-templates/commit/74a00bf99b3c580733e4315d6a2ce8f6b7d2ed55) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - \- Fixed invalid build files - rollup now uses module: 'esnext'.

  \- Improved Django template tag parsing and formatting, with clearer `template tag` terminology and expanded support for tags such as `ifequal`, `ifnotequal`, `thumbnail`, and `trans`.

  \- Fixed formatting around standalone and block-style template tags, including better handling of `extends` + `block` layouts and preservation of raw/verbatim/comment block bodies.

  \- Added stricter parser errors for malformed templates, including unterminated expressions/comments/tags and misnested closing tags.

  \- Expanded regression coverage with many renamed and new `template\_tag\_\*` fixtures, plus new cases for malformed input and edge-case formatting behavior.

  \- Hardened packaging and release verification by switching the browser build to `browser.mjs`, tightening package exports, and adding CI/package smoke-test checks.

  \- Refreshed README/package metadata to consistently describe the plugin as formatting Django HTML templates.

## 0.0.2

### Patch Changes

- [#3](https://github.com/EpicAlbin03/prettier-plugin-django-templates/pull/3) [`75ccafe`](https://github.com/EpicAlbin03/prettier-plugin-django-templates/commit/75ccafe3c0efd2f0d9f6581a178d341a934f5840) Thanks [@EpicAlbin03](https://github.com/EpicAlbin03)! - fix: blank space after comment, fix: readme formatting

## 0.0.1

- initial Django-focused package metadata, docs, tests, and parser source
