# Vendored anti-slop

## Source identity

- Source repository: <https://github.com/dmmulroy/anti-slop>.
- Copied from the installed skill at `.agents/skills/install-anti-slop/assets/anti-slop/`.
- Exact upstream commit: unknown; the installed skill does not record one.
- Recoverable pristine snapshot: <https://github.com/EpicAlbin03/django-templates-extension>, commit `3b42752f4e6231dc70ff011a245560198fae663d`, directory `.agents/skills/install-anti-slop/assets/anti-slop/`. This identifies the actual copied assets, not an inferred upstream HEAD.
- Skill identity in `skills-lock.json`: source `dmmulroy/anti-slop`, path `skills/install-anti-slop/SKILL.md`, computed hash `1b9b5d3c0d9e0ef8dd7631f4d637e66b62a73e34dceaf4ae07c0d3de376fd7d7`. This is skill metadata, not an upstream commit.

## Installed files and local choices

- Generic entry point: `tools/oxlint/anti-slop/index.ts`.
- Generic implementation: adjacent `rules/`, `shared/`, and `vendor/` directories, copied verbatim from the snapshot above.
- The optional `effect/` directory is intentionally omitted at the user's request. No Effect plugin or rules are registered.
- This provenance file is added locally. No generic rule implementation or diagnostic is changed.
- `vendor/eslint-stylistic/LICENSE` and `vendor/eslint-stylistic/UPSTREAM.md` are retained verbatim; the latter records the nested upstream revision and adaptations.
- All 18 generic rules and native `oxc/no-accumulating-spread` are enabled at error severity in the root `vite.config.ts`.
- `oxlint` and `@oxlint/plugins` are development dependencies pinned through the workspace catalog to `1.88.0`, matching Vite+ 1.3.0's bundled versions.
- Vite+ lint and format ignores exclude the vendored plugin and agent tooling. Existing project ignores and rules are preserved.

## Updating

Compare against the pristine snapshot before applying upstream changes. Preserve repository-owned policy, this record, and the nested Stylistic license/provenance. Keep Oxlint and `@oxlint/plugins` versions aligned with each other and the Vite+ toolchain. Do not add the optional Effect plugin without an explicit request.
