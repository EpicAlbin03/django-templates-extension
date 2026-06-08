# Prettier Plugin Django

Format Django templates with Prettier.

## Install

```bash
npm i -D prettier prettier-plugin-django
```

## Configure

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

## Notes

- Uses Prettier's HTML parser under the hood.
- Preserves Django template tags via placeholders during formatting.
- Supports `{% verbatim %}...{% endverbatim %}` blocks.

# TODO:

- README
- LICENSE
- CHANGELOG
- Remove @svitejs/changesets-changelog-github-compact
