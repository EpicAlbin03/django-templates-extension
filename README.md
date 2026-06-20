# Prettier Plugin Django Templates

Format Django HTML templates with Prettier.

## Install

```bash
npm i -D prettier prettier-plugin-django-templates
```

## Usage

Add the plugin to your Prettier config:

```json
{
  "plugins": ["prettier-plugin-django-templates"]
}
```

The plugin provides the `django-html` parser for Django HTML templates in `.html` files. In most setups, adding the plugin is enough. If you need to force the parser for specific files, use a Prettier override:

```json
{
  "plugins": ["prettier-plugin-django-templates"],
  "overrides": [
    {
      "files": "*.html",
      "options": {
        "parser": "django-html"
      }
    }
  ]
}
```

## Ignore sections

Using ignore regions is the best way to tell Prettier to leave part of a Django HTML template unchanged. Most of the time this is necessary for template tags inside embedded content such as `<script>` or `<style>` elements:

```html
<!-- prettier-ignore-start -->
<script>
  window.someData = {{ data|safe }}
</script>
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
<style>
  :root { --accent-color: {{ theme_accent_color }} }
</style>
<!-- prettier-ignore-end -->
```

Or using template comments:

```html
{# prettier-ignore-start #}
<script>
  window.someData = {{ data|safe }}
</script>
{# prettier-ignore-end #}

{# prettier-ignore-start #}
<style>
  :root { --accent-color: {{ theme_accent_color }} }
</style>
{# prettier-ignore-end #}
```

## Usage in the browser

Usage in the browser is semi-supported. Import `prettier-plugin-django-templates/browser` from an ESM-aware bundler to get a version that depends on `prettier/standalone` and does not use Node APIs. What isn't supported in a good way yet is using this without a build step, you still need a bundler like Vite to build everything together as one self-contained package in advance.

## Credits

- [prettier-plugin-jinja-template](https://github.com/davidodenwald/prettier-plugin-jinja-template/tree/master) (parser, printer, tests)
- [prettier-plugin-svelte](https://github.com/sveltejs/prettier-plugin-svelte/tree/main) (tooling)

## License

Licensed under the [MIT license](https://github.com/EpicAlbin03/prettier-plugin-django-templates/blob/main/LICENSE).
