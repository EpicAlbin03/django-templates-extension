![English](https://img.shields.io/badge/lang-en-blue) [![Português do Brasil](https://img.shields.io/badge/lang-pt--BR-green)](README.pt-br.md) [![Português](https://img.shields.io/badge/lang-pt-green)](README.pt-pt.md)

# Django/Jinja Template Support for VS Code

A Visual Studio Code extension that provides syntax highlighting and formatting support for Django and Jinja2 template files.

## Features

### Syntax Highlighting

- Full syntax highlighting for Django/Jinja template tags (`{% %}`, `{{ }}`, `{# #}`)
- Injection-based highlighting that works in HTML, JavaScript, TypeScript, and XML files
- Automatic highlighting in files within `templates` or `template` folders

### Smart Comment Wrapping for TypeScript/JavaScript

- Automatically wraps Django template tags with `/* */` comments when opening TS/JS files
- Removes the comment wrappers when saving (so the file is saved cleanly)
- Comment markers (`/*` and `*/`) are rendered nearly invisible (15% opacity, condensed spacing)
- Preserves TypeScript/JavaScript language features while hiding template tag syntax errors

### Formatting

- Powered by Prettier for consistent code formatting
- Preserves Django/Jinja template tags during formatting
- Supports HTML, JavaScript, TypeScript, and XML files in template folders
- Auto-detects Python projects (looks for `manage.py`, `pyproject.toml`, `setup.py`, `requirements.txt`, or `Pipfile`)

## Supported Languages

| File Type                   | Extension                                        | Language ID   |
| --------------------------- | ------------------------------------------------ | ------------- |
| Django/Jinja HTML           | `.djhtml`, `.django`, `.jinja`, `.jinja2`, `.j2` | `django-html` |
| HTML with Django tags       | `.html` (in template folders)                    | `html`        |
| JavaScript with Django tags | `.js` (in template folders)                      | `javascript`  |
| TypeScript with Django tags | `.ts` (in template folders)                      | `typescript`  |
| XML with Django tags        | `.xml` (in template folders)                     | `xml`         |

## Commands

| Command                                                | Description                                    |
| ------------------------------------------------------ | ---------------------------------------------- |
| `Django Template: Set as Django/Jinja HTML`            | Set the current file's language to Django HTML |
| `Django Template: Wrap Django tags with /* */`         | Manually wrap Django tags with comment markers |
| `Django Template: Unwrap Django tags (remove /* */)`   | Manually remove comment wrappers               |
| `Django Template: Toggle auto wrap/unwrap Django tags` | Enable/disable automatic wrapping              |

## Configuration

| Setting                                            | Type    | Default                     | Description                                                                   |
| -------------------------------------------------- | ------- | --------------------------- | ----------------------------------------------------------------------------- |
| `djangoTemplateExtension.enableFormatting`         | boolean | `true`                      | Enable formatting for files in template folders                               |
| `djangoTemplateExtension.templateFolderNames`      | array   | `["templates", "template"]` | Folder names to be recognized as template folders                             |
| `djangoTemplateExtension.autoDetectPythonProject`  | boolean | `true`                      | Only activate formatting when inside a Python project                         |
| `djangoTemplateExtension.wrapDjangoTagsInComments` | boolean | `true`                      | Auto wrap Django tags with `/* */` on open and unwrap on save for TS/JS files |

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Django Jinja Template Support"
4. Click Install

### From VSIX

1. Download the `.vsix` file from the releases page
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the `...` menu and select "Install from VSIX..."
5. Select the downloaded file

## Usage

### HTML Templates

Files with `.djhtml`, `.django`, `.jinja`, `.jinja2`, or `.j2` extensions are automatically recognized as Django HTML templates. For regular `.html` files in template folders, use the "Set as Django/Jinja HTML" command or right-click menu option.

### TypeScript/JavaScript Templates

When you open a TypeScript or JavaScript file containing Django template tags:

1. The extension automatically wraps template tags with `/* */` comments
2. The `/*` and `*/` markers are visually hidden
3. When you save, the comment wrappers are removed
4. After saving, they are re-applied for continued editing

### Formatting

Use the standard VS Code format command (Shift+Alt+F) to format your template files. The extension will preserve Django/Jinja template tags while formatting the surrounding code.

## Known Limitations

- **Document Dirty State**: When opening TS/JS files with Django tags, the document will be marked as modified due to the automatic wrapping. This is a limitation of the VS Code API.
- **Comment Markers Visibility**: The `/* */` comment markers are rendered nearly invisible (15% opacity, condensed spacing) but can still be seen on close inspection and selected with keyboard navigation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.
