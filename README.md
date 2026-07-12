# Django Templates

Django template support for HTML files in VS Code. Templates keep the built-in `html` language mode while gaining Django-specific features.

## Features

- **Syntax highlighting** for tags, variables, filters, and comments
- **Completions** for Django tags and filters
- **Tooltips** with examples and reference links
- **Snippets** for common tags and filters
- **Formatting** with Prettier
- **3rd-party package support** for popular Django libraries

## Packages

- VS Code extension: [django-templates-ext](./packages/django-vscode) / [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=EpicAlbin03.django-templates-ext) / [VSX](https://open-vsx.org/extension/EpicAlbin03/django-templates-ext)
- Language server (LSP): [django-template-language-server](./packages/language-server) / [npm](https://www.npmjs.com/package/django-template-language-server)

## Development

Requires Node.js 22.18 or later and [Vite+](https://viteplus.dev/).

```sh
vp install
vp run watch
```

Run all checks, tests, and builds with:

```sh
vp run ready
```

## Credits

- [Svelte Language Tools](https://github.com/sveltejs/language-tools) (repo blueprint)
- [django-template-extension](https://github.com/jraylan/django-template-extension) (django)
- [vscode-django](https://github.com/vscode-django/vscode-django) (django)
- [vscode-django-support](https://github.com/junstyle/vscode-django-support) (django)
- [prettier-plugin-django-templates](https://github.com/EpicAlbin03/prettier-plugin-django-templates) (formatting)

## License

Licensed under the [MIT license](https://github.com/EpicAlbin03/django-templates-extension/blob/main/packages/language-server/LICENSE).
