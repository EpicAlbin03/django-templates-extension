# Django Templates for VS Code

Django template support for HTML files in VS Code. Templates keep the built-in `html` language mode while gaining Django-specific features.

## Features

- **Syntax highlighting** for tags, variables, filters, and comments
- **Completions** for Django tags and filters
- **Tooltips** with examples and reference links
- **Snippets** for common tags and filters
- **Formatting** with Prettier
- **Django Templates: Restart Language Server** command

## Formatting

Set Django Templates as the formatter for HTML files:

```json
{
  "[html]": {
    "editor.defaultFormatter": "EpicAlbin03.django-vscode"
  }
}
```

Then use **Format Document** or enable `editor.formatOnSave`.

## Credits

- [Django Template Language Server](../language-server/README.md) (LSP)
- [Svelte for VS Code](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-vscode) (repo blueprint)
- [django-template-extension](https://github.com/jraylan/django-template-extension) (django)
- [vscode-django](https://github.com/vscode-django/vscode-django) (django)
- [vscode-django-support](https://github.com/junstyle/vscode-django-support) (django)
- [prettier-plugin-django-templates](https://github.com/EpicAlbin03/prettier-plugin-django-templates) (formatting)

## License

Licensed under the [MIT license](../../LICENSE).
