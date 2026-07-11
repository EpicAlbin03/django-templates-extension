# Django Template Language Server

A [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation for Django templates in HTML files.

## Features

- Completions for Django template tags and filters
- Tooltips with examples and reference links
- Formatting with Prettier (`prettier-plugin-django-templates`)

## Usage

Requires Node.js 22.18 or later.

```sh
npm install --global django-template-language-server
djangotemplateserver --stdio
```

The package also exports `startServer` for programmatic use:

```js
import { startServer } from "django-template-language-server";

startServer();
```

## Credits

- [Svelte Language Server](https://github.com/sveltejs/language-tools/tree/master/packages/language-server) (repo blueprint)
- [django-template-extension](https://github.com/jraylan/django-template-extension) (django)
- [vscode-django](https://github.com/vscode-django/vscode-django) (django)
- [vscode-django-support](https://github.com/junstyle/vscode-django-support) (django)
- [prettier-plugin-django-templates](https://github.com/EpicAlbin03/prettier-plugin-django-templates) (formatting)

## License

Licensed under the [MIT license](../../LICENSE).
