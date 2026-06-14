# django-templates-extension

This project is a VS Code extension that provides syntax highlighting, snippets, LSP, and formatting (using `prettier-plugin-django-templates`) for Django templates (`.html` files with Django template tags).

It uses the `sveltejs-language-tools` repository as a starting point to build off of, and borrows django-specific code from `django-template-extension` and `vscode-django-support`.

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
