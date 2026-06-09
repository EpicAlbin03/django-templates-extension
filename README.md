# Prettier Plugin Django

Format Django templates with Prettier.

## Install

```bash
npm i -D prettier prettier-plugin-django
```

## Usage

Add the plugin to your Prettier config:

```json
{
  "plugins": ["prettier-plugin-django"]
}
```

The plugin provides the `django-html` parser for Django templates in `.html` files. In most setups, adding the plugin is enough. If you need to force the parser for specific files, use a Prettier override:

```json
{
  "plugins": ["prettier-plugin-django"],
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

Using range ignores is the best way to tell prettier to ignore part of files. Most of the time this is necessary for Django tags inside script or style tags:

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

Or using Django comments:

```html
{# prettier-ignore-start #}
<script>
  window.someData = {{ data|safe }}
</script>
{# prettier-ignore-end #} {# prettier-ignore-start #}
<style>
  :root { --accent-color: {{ theme_accent_color }} }
</style>
{# prettier-ignore-end #}
```
