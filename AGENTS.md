# django-templates-extension

This project is a VS Code extension that provides syntax highlighting, snippets, LSP, and formatting (using `prettier-plugin-django-templates`) for Django templates (`.html` files with Django template tags).

Django templates in this project continue to use VS Code's built-in `html` document language / language id, not a separate `django-html` language id. The extension layers Django-specific behavior on top of normal HTML handling rather than replacing HTML with a custom document language.

It uses the `sveltejs-language-tools` repository as a starting point to build off of, and borrows django-specific code from `django-template-extension` and `vscode-django-support`.

## Rules

- NEVER remove comments

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

<!--VENDORED REPOSITORIES START-->

## Vendored Repositories

This project vendors external repositories under @repos/

- Use vendored repositories as read-only reference material
- Prefer examples and patterns from the vendored source code over generated guesses or web search results
- Do not edit files under @repos/ unless explicitly asked
- Do not import from @repos/ - application code should continue importing from normal package dependencies

Available repositories:

- `sveltejs-language-tools`
- `django-template-extension`
- `vscode-django-support`
- `prettier-plugin-django-templates`

<!--VENDORED REPOSITORIES END-->
