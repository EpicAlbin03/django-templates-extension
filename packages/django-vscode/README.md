# Django HTML Templates

Django template support for HTML files in VS Code. Templates keep the built-in `html` language mode while gaining Django-specific features.

## Features

- **Syntax highlighting** for tags, variables, filters, and comments
- **Completions** for Django tags and filters
- **Tooltips** with examples and reference links
- **Snippets** for common tags and filters
- **Formatting** with Prettier
- **3rd-party package support** for popular Django libraries

### Syntax Highlighting

Highlights Django tags, variables, filters, and comments alongside normal HTML.

<img src="https://github.com/EpicAlbin03/django-templates-extension/raw/main/packages/django-vscode/img/formatting-syntax.png" alt="Syntax highlighting and formatting" width="800">

### Formatting

Formats Django templates with Prettier while preserving template syntax.

Set Django Templates as the formatter for HTML files:

```json
{
  "[html]": {
    "editor.defaultFormatter": "EpicAlbin03.django-templates-ext"
  }
}
```

Then use **Format Document** or enable `editor.formatOnSave`.

### Completions

Provides LSP completions for Django template tags and filters as you type.

<img src="https://github.com/EpicAlbin03/django-templates-extension/raw/main/packages/django-vscode/img/completion-tag.png" alt="Tag completions" width="400"> <img src="https://github.com/EpicAlbin03/django-templates-extension/raw/main/packages/django-vscode/img/completion-filter.png" alt="Filter completions" width="500">

### Tooltips

Shows documentation, examples, and reference links when hovering over supported tags and filters.

<img src="https://github.com/EpicAlbin03/django-templates-extension/raw/main/packages/django-vscode/img/tooltip.png" alt="tooltip" width="500">

### Snippets

Type an abbreviation and select the matching snippet from the completion list.

<img src="https://github.com/EpicAlbin03/django-templates-extension/raw/main/packages/django-vscode/img/snippets.png" alt="snippets" width="500">

#### Tags

| Abbreviation                  | Tag                                                                         |
| ----------------------------- | --------------------------------------------------------------------------- |
| `variable`                    | `{{ var }}`                                                                 |
| `super`                       | `{{ block.super }}`                                                         |
| `tag`                         | `{% tag %}`                                                                 |
| `autoescape`                  | `{% autoescape %} {% endautoescape %}`                                      |
| `autoescape_paste`            | `{% autoescape %} … {% endautoescape %}`                                    |
| `endautoescape`               | `{% endautoescape %}`                                                       |
| `block`                       | `{% block %} {% endblock %}`                                                |
| `block_unnamed`               | `{% block %} {% endblock %}`                                                |
| `endblock`                    | `{% endblock %}`                                                            |
| `comm`                        | `{# #}`                                                                     |
| `comment`                     | `{% comment %} {% endcomment %}`                                            |
| `comment_note`                | `{% comment "" %} {% endcomment %}`                                         |
| `comment_paste`               | `{% comment %}…{% endcomment %}`                                            |
| `comment_selection`           | `{% comment %} … {% endcomment %}`                                          |
| `endcomment`                  | `{% endcomment %}`                                                          |
| `csrf_token`                  | `{% csrf_token %}`                                                          |
| `cycle`                       | `{% cycle %}`                                                               |
| `debug`                       | `{% debug %}`                                                               |
| `extends`                     | `{% extends '' %}`                                                          |
| `filter`                      | `{% filter %} {% endfilter %}`                                              |
| `endfilter`                   | `{% endfilter %}`                                                           |
| `firstof`                     | `{% firstof %}`                                                             |
| `firstof_as`                  | `{% firstof as %}`                                                          |
| `for`                         | `{% for in %} {% endfor %}`                                                 |
| `for_paste`                   | `{% for in %}…{% endfor %}`                                                 |
| `endfor`                      | `{% endfor %}`                                                              |
| `forempty`                    | `{% for in %} {% empty %} {% endfor %}`                                     |
| `forempty_paste`              | `{% for in %}…{% empty %} {% endfor %}`                                     |
| `if`                          | `{% if %} {% endif %}`                                                      |
| `if_paste`                    | `{% if %}…{% endif %}`                                                      |
| `ifelse`                      | `{% if %} {% else %} {% endif %}`                                           |
| `ifelse_paste`                | `{% if %}…{% else %} {% endif %}`                                           |
| `elif`                        | `{% elif %}`                                                                |
| `else`                        | `{% else %}`                                                                |
| `endif`                       | `{% endif %}`                                                               |
| `ifchanged`                   | `{% ifchanged %} {% endifchanged %}`                                        |
| `endifchanged`                | `{% endifchanged %}`                                                        |
| `include`                     | `{% include %}`                                                             |
| `load`                        | `{% load %}`                                                                |
| `lorem`                       | `{% lorem random %}`                                                        |
| `now`                         | `{% now "" %}`                                                              |
| `regroup`                     | `{% regroup by as _list %}`                                                 |
| `regroup_example`             | `{% regroup object_list by category as category_list %} … {% endfor %}`     |
| `resetcycle`                  | `{% resetcycle %}`                                                          |
| `spaceless`                   | `{% spaceless %} {% endspaceless %}`                                        |
| `spaceless_paste`             | `{% spaceless %} … {% endspaceless %}`                                      |
| `endspaceless`                | `{% endspaceless %}`                                                        |
| `templatetag`                 | `{% templatetag %}`                                                         |
| `url`                         | `{% url '' %}`                                                              |
| `urlpk`                       | `{% url '' pk=object.pk %}`                                                 |
| `urlslug`                     | `{% url '' slug=object.slug %}`                                             |
| `verbatim`                    | `{% verbatim %} {% endverbatim %}`                                          |
| `verbatim_unnamed`            | `{% verbatim %} {% endverbatim %}`                                          |
| `verbatim_paste`              | `{% verbatim %}…{% endverbatim %}`                                          |
| `endverbatim`                 | `{% endverbatim %}`                                                         |
| `widthratio`                  | `{% widthratio this_value max_value max_width %}`                           |
| `widthratio_as`               | `{% widthratio this_value max_value max_width as width %}`                  |
| `with`                        | `{% with name=value %} {% endwith %}`                                       |
| `with_as`                     | `{% with as %} {% endwith %}`                                               |
| `endwith`                     | `{% endwith %}`                                                             |
| `with_selection`              | `{% with name=value %} … {% endwith %}`                                     |
| `with_paste`                  | `{% with name=value %}…{% endwith %}`                                       |
| `trans`                       | `{% trans "…" %}`                                                           |
| `trans_paste`                 | `{% trans "…" %}`                                                           |
| `blocktrans`                  | `{% blocktrans %} {% endblocktrans %}`                                      |
| `blocktrans_trimmed`          | `{% blocktrans trimmed %} {% endblocktrans %}`                              |
| `blocktrans_paste`            | `{% blocktrans %} … {% endblocktrans %}`                                    |
| `blocktrans_with`             | `{% blocktrans with = %} {% endblocktrans %}`                               |
| `blocktrans_with_trimmed`     | `{% blocktrans with = trimmed %} {% endblocktrans %}`                       |
| `blocktrans_with_paste`       | `{% blocktrans with = %} … {% endblocktrans %}`                             |
| `translate`                   | `{% translate "…" %}`                                                       |
| `translate_paste`             | `{% translate "…" %}`                                                       |
| `blocktranslate`              | `{% blocktranslate %} {% endblocktranslate %}`                              |
| `blocktranslate_trimmed`      | `{% blocktranslate trimmed %} {% endblocktranslate %}`                      |
| `blocktranslate_paste`        | `{% blocktranslate %} … {% endblocktranslate %}`                            |
| `blocktranslate_with`         | `{% blocktranslate with = %} {% endblocktranslate %}`                       |
| `blocktranslate_with_trimmed` | `{% blocktranslate with = trimmed %} {% endblocktranslate %}`               |
| `blocktranslate_with_paste`   | `{% blocktranslate with = %} … {% endblocktranslate %}`                     |
| `static`                      | `{% static '…' %}`                                                          |
| `get_static_prefix`           | `{% get_static_prefix as STATIC_PREFIX %}`                                  |
| `get_media_prefix`            | `{% get_media_prefix as MEDIA_PREFIX %}`                                    |
| `get_available_languages`     | `{% get_available_languages as LANGUAGES %}`                                |
| `get_current_language`        | `{% get_current_language as LANGUAGE_CODE %}`                               |
| `get_current_language_bidi`   | `{% get_current_language_bidi as LANGUAGE_BIDI %}`                          |
| `get_language_info`           | `{% get_language_info for LANGUAGE_CODE as language %}`                     |
| `get_language_info_list`      | `{% get_language_info_list for LANGUAGES as languages %}`                   |
| `localize`                    | `{% localize %} {% endlocalize %}`                                          |
| `endlocalize`                 | `{% endlocalize %}`                                                         |
| `localtime`                   | `{% localtime %} {% endlocaltime %}`                                        |
| `endlocaltime`                | `{% endlocaltime %}`                                                        |
| `timezone`                    | `{% timezone 'Europe/Stockholm' %} {% endtimezone %}`                       |
| `endtimezone`                 | `{% endtimezone %}`                                                         |
| `get_current_timezone`        | `{% get_current_timezone as TIME_ZONE %}`                                   |
| `cache`                       | `{% cache 500 fragment_name %} {% endcache %}`                              |
| `endcache`                    | `{% endcache %}`                                                            |
| `language`                    | `{% language 'fr' %} {% endlanguage %}`                                     |
| `endlanguage`                 | `{% endlanguage %}`                                                         |
| `ifequal`                     | `{% ifequal %} {% endifequal %}`                                            |
| `endifequal`                  | `{% endifequal %}`                                                          |
| `ifnotequal`                  | `{% ifnotequal %} {% endifnotequal %}`                                      |
| `endifnotequal`               | `{% endifnotequal %}`                                                       |
| `partialdef`                  | `{% partialdef name %} {% endpartialdef %}`                                 |
| `endpartialdef`               | `{% endpartialdef %}`                                                       |
| `partial`                     | `{% partial name %}`                                                        |
| `querystring`                 | `{% querystring %}`                                                         |
| `querystring_set`             | `{% querystring key=value %}`                                               |
| `csp_nonce_attr`              | `{% csp_nonce_attr %}`                                                      |
| `empty`                       | `{% empty %}`                                                               |
| `plural`                      | `{% plural %}`                                                              |
| `endblocktranslate`           | `{% endblocktranslate %}`                                                   |
| `endblocktrans`               | `{% endblocktrans %}`                                                       |
| `thumbnail`                   | `{% thumbnail image '300x200' as im %} {% endthumbnail %}`                  |
| `thumbnail_crop`              | `{% thumbnail image '300x200' crop='center' as im %} {% endthumbnail %}`    |
| `endthumbnail`                | `{% endthumbnail %}`                                                        |
| `component`                   | `{% component 'name' %} {% endcomponent %}`                                 |
| `component_attr`              | `{% component 'name' attr=value %} {% endcomponent %}`                      |
| `endcomponent`                | `{% endcomponent %}`                                                        |
| `component_block`             | `{% component_block 'name' %} {% endcomponent_block %}`                     |
| `endcomponent_block`          | `{% endcomponent_block %}`                                                  |
| `fill`                        | `{% fill 'slot' %} {% endfill %}`                                           |
| `endfill`                     | `{% endfill %}`                                                             |
| `slot`                        | `{% slot 'name' %} {% endslot %}`                                           |
| `endslot`                     | `{% endslot %}`                                                             |
| `provide`                     | `{% provide 'name' key=value %} {% endprovide %}`                           |
| `endprovide`                  | `{% endprovide %}`                                                          |
| `html_attrs`                  | `{% html_attrs attrs %}`                                                    |
| `html_attrs_class`            | `{% html_attrs attrs class='class-name' %}`                                 |
| `html_attrs_defaults`         | `{% html_attrs attrs defaults:class='card' %}`                              |
| `component_css_dependencies`  | `{% component_css_dependencies %}`                                          |
| `component_js_dependencies`   | `{% component_js_dependencies %}`                                           |
| `compress`                    | `{% compress %} {% endcompress %}`                                          |
| `endcompress`                 | `{% endcompress %}`                                                         |
| `addtoblock`                  | `{% addtoblock 'js' %} {% endaddtoblock %}`                                 |
| `endaddtoblock`               | `{% endaddtoblock %}`                                                       |
| `with_data`                   | `{% with_data 'name' key=value %} {% endwith_data %}`                       |
| `endwith_data`                | `{% endwith_data %}`                                                        |
| `render_block`                | `{% render_block 'js' %}`                                                   |
| `add_data`                    | `{% add_data 'name' value %}`                                               |
| `flag`                        | `{% flag 'flag_name' %} {% endflag %}`                                      |
| `endflag`                     | `{% endflag %}`                                                             |
| `switch`                      | `{% switch 'switch_name' %} {% endswitch %}`                                |
| `endswitch`                   | `{% endswitch %}`                                                           |
| `sample`                      | `{% sample 'sample_name' %} {% endsample %}`                                |
| `endsample`                   | `{% endsample %}`                                                           |
| `wafflejs`                    | `{% wafflejs %}`                                                            |
| `recursetree`                 | `{% recursetree nodes %} {% endrecursetree %}`                              |
| `endrecursetree`              | `{% endrecursetree %}`                                                      |
| `drilldown_tree_for_node`     | `{% drilldown_tree_for_node node as drilldown %}`                           |
| `full_tree_for_model`         | `{% full_tree_for_model app.Model as tree %}`                               |
| `placeholder`                 | `{% placeholder 'content' %} {% endplaceholder %}`                          |
| `endplaceholder`              | `{% endplaceholder %}`                                                      |
| `static_placeholder`          | `{% static_placeholder 'footer' %} {% endstatic_placeholder %}`             |
| `endstatic_placeholder`       | `{% endstatic_placeholder %}`                                               |
| `render_model_block`          | `{% render_model_block object 'field' %} {% endrender_model_block %}`       |
| `endrender_model_block`       | `{% endrender_model_block %}`                                               |
| `render_model_add_block`      | `{% render_model_add_block object %} {% endrender_model_add_block %}`       |
| `endrender_model_add_block`   | `{% endrender_model_add_block %}`                                           |
| `render_plugin_block`         | `{% render_plugin_block plugin %} {% endrender_plugin_block %}`             |
| `endrender_plugin_block`      | `{% endrender_plugin_block %}`                                              |
| `cms_admin_url`               | `{% cms_admin_url object 'change' %}`                                       |
| `page_attribute`              | `{% page_attribute 'page_title' %}`                                         |
| `page_url`                    | `{% page_url page %}`                                                       |
| `page_id_url`                 | `{% page_id_url page_id %}`                                                 |
| `page_language_url`           | `{% page_language_url 'language_code' %}`                                   |
| `render_model`                | `{% render_model object 'field' %}`                                         |
| `render_model_icon`           | `{% render_model_icon object 'field' %}`                                    |
| `render_model_add`            | `{% render_model_add object %}`                                             |
| `render_placeholder`          | `{% render_placeholder placeholder %}`                                      |
| `render_uncached_placeholder` | `{% render_uncached_placeholder placeholder %}`                             |
| `render_plugin`               | `{% render_plugin plugin %}`                                                |
| `show_placeholder`            | `{% show_placeholder 'content' request.current_page %}`                     |
| `static_alias`                | `{% static_alias 'alias' %}`                                                |
| `cms_toolbar`                 | `{% cms_toolbar %}`                                                         |
| `element`                     | `{% element 'button' %} {% endelement %}`                                   |
| `element_attr`                | `{% element 'button' type='submit' %} {% endelement %}`                     |
| `endelement`                  | `{% endelement %}`                                                          |
| `crispy`                      | `{% crispy form %}`                                                         |
| `crispy_field`                | `{% crispy_field form.field %}`                                             |
| `crispy_addon`                | `{% crispy_addon form.field append='@example.com' %} {% endcrispy_addon %}` |
| `endcrispy_addon`             | `{% endcrispy_addon %}`                                                     |

#### Filters

- `join`
- `addslashes`
- `capfirst`
- `escapejs`
- `floatformat`
- `iriencode`
- `linenumbers`
- `lower`
- `make_list`
- `slugify`
- `stringformat`
- `title`
- `truncatechars`
- `truncatechars_html`
- `truncatewords`
- `truncatewords_html`
- `upper`
- `urlencode`
- `urlize`
- `urlizetrunc`
- `wordcount`
- `wordwrap`
- `ljust`
- `rjust`
- `center`
- `cut`
- `escape`
- `force_escape`
- `linebreaks`
- `linebreaksbr`
- `safe`
- `safeseq`
- `striptags`
- `dictsort`
- `dictsortreversed`
- `first`
- `last`
- `length`
- `length_is`
- `random`
- `slice`
- `unordered_list`
- `add`
- `get_digit`
- `date`
- `time`
- `timesince`
- `timeuntil`
- `default`
- `default_if_none`
- `divisibleby`
- `yesno`
- `filesizeformat`
- `pluralize`
- `phone2numeric`
- `pprint`
- `escapeseq`
- `json_script`
- `language_name`
- `language_name_local`
- `language_bidi`
- `language_name_translated`
- `localize`
- `unlocalize`
- `localtime`
- `utc`
- `timezone`
- `apnumber`
- `intcomma`
- `intword`
- `naturalday`
- `naturaltime`
- `ordinal`
- `tree_info`
- `tree_path`
- `crispy`
- `as_crispy_errors`
- `as_crispy_field`
- `flatatt`
- `optgroups`
- `resolution`
- `is_portrait`
- `margin`
- `background_margin`
- `markdown_thumbnails`
- `html_thumbnails`

### 3rd-party Support

Completions, tooltips, and snippets include template tags and filters from popular packages:

- [sorl-thumbnail](https://github.com/jazzband/sorl-thumbnail)
- [django-components](https://github.com/django-components/django-components)
- [django-compressor](https://github.com/django-compressor/django-compressor)
- [django-sekizai](https://github.com/ojii/django-sekizai)
- [django-waffle](https://github.com/django-waffle/django-waffle)
- [django-mptt](https://github.com/django-mptt/django-mptt)
- [django CMS](https://github.com/django-cms/django-cms)
- [django-allauth](https://github.com/pennersr/django-allauth)
- [django-crispy-forms](https://github.com/django-crispy-forms/django-crispy-forms)

### Troubleshooting

You may want to force the html language if you are using other extensions that defaults to "django-html" (ex: "batisteo.vscode-django").

```json
{
  "files.associations": {
    "**/templates/**/*.html": "html"
  }
}
```

Other extensions may also intefer with the syntax highlighting (ex: "vue.volar").

Use the `Django Templates: Restart Language Server` command to restart the language server.

## Credits

- [Django Template Language Server](https://github.com/EpicAlbin03/django-templates-extension/blob/main/packages/language-server/README.md) (LSP)
- [Svelte for VS Code](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-vscode) (repo blueprint)
- [django-template-extension](https://github.com/jraylan/django-template-extension) (django)
- [vscode-django](https://github.com/vscode-django/vscode-django) (django)
- [vscode-django-support](https://github.com/junstyle/vscode-django-support) (django)
- [prettier-plugin-django-templates](https://github.com/EpicAlbin03/prettier-plugin-django-templates) (formatting)

## License

Licensed under the [MIT license](https://github.com/EpicAlbin03/django-templates-extension/blob/main/packages/django-vscode/LICENSE).
