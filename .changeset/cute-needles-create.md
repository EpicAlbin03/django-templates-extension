---
'prettier-plugin-django-templates': minor
---

\- Fixed invalid build files - rollup now uses module: 'esnext'.

\- Improved Django template tag parsing and formatting, with clearer `template tag` terminology and expanded support for tags such as `ifequal`, `ifnotequal`, `thumbnail`, and `trans`.

\- Fixed formatting around standalone and block-style template tags, including better handling of `extends` + `block` layouts and preservation of raw/verbatim/comment block bodies.

\- Added stricter parser errors for malformed templates, including unterminated expressions/comments/tags and misnested closing tags.

\- Expanded regression coverage with many renamed and new `template\_tag\_\*` fixtures, plus new cases for malformed input and edge-case formatting behavior.

\- Hardened packaging and release verification by switching the browser build to `browser.mjs`, tightening package exports, and adding CI/package smoke-test checks.

\- Refreshed README/package metadata to consistently describe the plugin as formatting Django HTML templates.
