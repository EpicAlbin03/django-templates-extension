# Changelog

## Unreleased

- Remove the invalid `endfirstof` snippet.
- Add lazy filesystem-backed template-path completions for quoted `extends` and `include` arguments, including configurable roots, multi-root workspaces, trust safeguards, and watched-file freshness.
- Report formatter failures once with a concise notification while retaining detailed diagnostics in the Django Templates output channel.
- Validate language-server paths before launch and keep inspector arguments isolated to debug launches.
- Make language-server restarts retryable and concurrency-safe, and dispose the client and output channel exactly once during deactivation.

See https://github.com/EpicAlbin03/django-templates-extension/releases
