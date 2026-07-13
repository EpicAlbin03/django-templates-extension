# Changelog

## Unreleased

- Report formatter failures once with a concise notification while retaining detailed diagnostics in the Django Templates output channel.
- Validate language-server paths before launch and keep inspector arguments isolated to debug launches.
- Make language-server restarts retryable and concurrency-safe, and dispose the client and output channel exactly once during deactivation.

See https://github.com/EpicAlbin03/django-templates-extension/releases
