# Changelog

## [1.2.2](https://github.com/jraylan/django-template-extension/compare/v1.2.1...v1.2.2) (2026-04-17)


### Bug Fixes

* prevent block tags from being re-flowed across lines [#11](https://github.com/jraylan/django-template-extension/issues/11) ([1880338f](https://github.com/jraylan/django-template-extension/commit/1880338fb59c349c6cea9b7055758acdf1116ba9))

## [1.2.1](https://github.com/jraylan/django-template-extension/compare/v1.2.0...v1.2.1) (2025-12-13)


### Bug Fixes

* disable auto wrap in JSX/TSX ([36487c6](https://github.com/jraylan/django-template-extension/commit/36487c6acf23f3388b0db9c8ee4a86f00d57ee36))


### Performance Improvements

* speed up tag scanning and formatting ([e4a0cb0](https://github.com/jraylan/django-template-extension/commit/e4a0cb0caa8e583b7918338c9866d5f9dd393a07))

## [1.2.0](https://github.com/jraylan/django-template-extension/compare/v1.1.0...v1.2.0) (2025-12-12)


### Features

* highlight Django tags in strings without wrapping with /* */ ([05ad937](https://github.com/jraylan/django-template-extension/commit/05ad9377df88d63e2202d7fbbd5ef0b24d8036f9))


### Bug Fixes

* Fix error on extension start ([815bc0d](https://github.com/jraylan/django-template-extension/commit/815bc0d5764ea50202ee107b23f614e0c5058875))

## [1.1.0](https://github.com/jraylan/django-template-extension/compare/v1.0.2...v1.1.0) (2025-12-12)


### Features

* Added Logo and License files ([bda0894](https://github.com/jraylan/django-template-extension/commit/bda0894ca7c83e8c67a834d0469c4d8d302ccb2f))

## [1.0.2](https://github.com/jraylan/django-template-extension/compare/v1.0.1...v1.0.2) (2025-12-12)


### Bug Fixes

* Added .vscodeignore ([7489af5](https://github.com/jraylan/django-template-extension/commit/7489af5529be698ad855c11ca0a5dd89c4fa7ebf))
* remove unused file ([d2e1c0c](https://github.com/jraylan/django-template-extension/commit/d2e1c0c275b1f2b3294482740f59f6e274f9d16b))
* remove unused file (2) ([a983958](https://github.com/jraylan/django-template-extension/commit/a9839585390edeec487d6a560877a62ca4f829a2))
* Update package home ([bfc15ff](https://github.com/jraylan/django-template-extension/commit/bfc15ff3e0b4de872026239324237389809f1834))

## [1.0.1](https://github.com/jraylan/django-template-extension/compare/v1.0.0...v1.0.1) (2025-12-12)


### Bug Fixes

* Update vscode version ([f7b13c9](https://github.com/jraylan/django-template-extension/commit/f7b13c9f22751165f8ff7579c0647b2717d94207))

## [1.0.0](https://github.com/jraylan/django-template-extension/commit/1fbc88316d1d3fa826dfcdf63d46bdb8710d0e3f) (2025-12-12)

### Added

- **Syntax Highlighting**: Full support for Django and Jinja2 template syntax
  - Template tags: `{% if %}`, `{% for %}`, `{% block %}`, `{% extends %}`, etc.
  - Template variables: `{{ variable }}`, `{{ object.property }}`
  - Template filters: `{{ value|filter }}`, `{{ value|filter:arg }}`
  - Template comments: `{# comment #}`

- **Smart Comment Wrapping**: Automatic handling of Django tags in JavaScript/TypeScript
  - Wraps Django tags with `/* */` when file is opened (prevents syntax errors)
  - Removes wrappers on save (keeps original Django syntax in file)
  - Nearly invisible markers (15% opacity) so they don't distract

- **Code Formatting**: Integrated Prettier support
  - HTML formatting with preserved Django tags
  - XML formatting support
  - Configurable through VS Code settings

- **Auto-detection**: Automatically activates for files in template directories
  - Detects `templates/` folder structure common in Django projects
  - Works with `.html`, `.htm`, `.xml` files

### Technical Details

- Built with TypeScript
- Uses TextMate grammar injection for syntax highlighting
- Leverages VS Code's Decoration API for invisible markers
- Integrates with Prettier v3 for formatting

### Requirements

- VS Code 1.78.0 or higher
- Node.js (for Prettier formatting)
