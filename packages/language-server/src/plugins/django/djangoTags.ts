export interface DjangoTagDoc {
  name: string;
  aliases?: string[];
  endTags?: string[];
  branches?: string[];
  branchDescriptions?: Record<string, string>;
  branchReferences?: Record<string, string>;
  endTagDescriptions?: Record<string, string>;
  endTagReferences?: Record<string, string>;
  relatedTags?: string[];
  load?: string;
  deprecated?: string;
  description: string;
  examples: string[];
  reference?: string;
}

// Django references
const builtinsReference = "https://docs.djangoproject.com/en/6.0/ref/templates/builtins/";
const translationReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/translation/";
const formattingReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/formatting/";
const timezoneReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/timezones/";
const cacheReference = "https://docs.djangoproject.com/en/6.0/topics/cache/";
const cspNonceAttrReference =
  "https://docs.djangoproject.com/en/6.1/ref/templates/builtins/#std-templatetag-csp_nonce_attr";
// 3rd party references
const sorlThumbnailReference = "https://sorl-thumbnail.readthedocs.io/en/latest/template.html";
const djangoComponentsReference =
  "https://django-components.github.io/django-components/latest/reference/template_tags/";
const djangoCompressorReference = "https://django-compressor.readthedocs.io/en/stable/usage.html";
const djangoSekizaiReference = "https://django-sekizai.readthedocs.io/en/latest/";
const djangoWaffleReference = "https://waffle.readthedocs.io/en/stable/usage/templates.html";
const djangoMpttReference = "https://django-mptt.readthedocs.io/en/latest/templates.html";
const djangoCmsReference = "https://docs.django-cms.org/en/latest/reference/templatetags.html";
const djangoAllauthReference = "https://docs.allauth.org/en/latest/common/templates.html";
const djangoCrispyFormsReference =
  "https://django-crispy-forms.readthedocs.io/en/latest/crispy_tag_forms.html";

export const djangoTagDocs: DjangoTagDoc[] = [
  {
    name: "autoescape",
    endTags: ["endautoescape"],
    endTagDescriptions: {
      endautoescape:
        "Closes an `{% autoescape %}` block and restores the previous automatic escaping behavior.",
    },
    description: "Controls whether automatic HTML escaping is enabled inside the block.",
    examples: [
      `{% autoescape off %}
  {{ trusted_html }}
{% endautoescape %}`,
    ],
    reference: `${builtinsReference}#autoescape`,
  },
  {
    name: "block",
    endTags: ["endblock"],
    endTagDescriptions: {
      endblock: "Closes a named `{% block %}` used by Django template inheritance.",
    },
    description:
      "Defines a named block that child templates can override when using template inheritance.",
    examples: [
      `{% block content %}
  <h1>{{ title }}</h1>
{% endblock %}`,
    ],
    reference: `${builtinsReference}#block`,
  },
  {
    name: "comment",
    endTags: ["endcomment"],
    endTagDescriptions: {
      endcomment: "Closes a `{% comment %}` block whose contents are ignored during rendering.",
    },
    description:
      "Ignores everything between the opening and closing tag during template rendering.",
    examples: [
      `{% comment "Optional note" %}
  This will not be rendered.
{% endcomment %}`,
    ],
    reference: `${builtinsReference}#comment`,
  },
  {
    name: "csrf_token",
    description:
      "Outputs the CSRF protection token for forms that submit with unsafe HTTP methods.",
    examples: [
      `<form method="post">
  {% csrf_token %}
  <button type="submit">Save</button>
</form>`,
    ],
    reference: `${builtinsReference}#csrf-token`,
  },
  {
    name: "cycle",
    description:
      "Cycles through a list of values each time the tag is rendered, often for alternating CSS classes.",
    examples: [
      `{% for row in rows %}
  <tr class="{% cycle 'odd' 'even' %}">{{ row }}</tr>
{% endfor %}`,
    ],
    reference: `${builtinsReference}#cycle`,
  },
  {
    name: "debug",
    description:
      "Outputs debugging information, including the current context and imported modules.",
    examples: [`{% debug %}`],
    reference: `${builtinsReference}#debug`,
  },
  {
    name: "extends",
    description: "Makes the current template inherit from a parent template.",
    examples: [`{% extends "base.html" %}`],
    reference: `${builtinsReference}#extends`,
  },
  {
    name: "filter",
    endTags: ["endfilter"],
    endTagDescriptions: {
      endfilter:
        "Closes a `{% filter %}` block after applying the configured filters to its contents.",
    },
    description: "Applies one or more template filters to the contents of the block.",
    examples: [
      `{% filter force_escape|lower %}
  {{ user_input }}
{% endfilter %}`,
    ],
    reference: `${builtinsReference}#filter`,
  },
  {
    name: "firstof",
    description: "Outputs the first variable or literal argument that evaluates to true.",
    examples: [`{% firstof user.get_full_name user.username "Anonymous" %}`],
    reference: `${builtinsReference}#firstof`,
  },
  {
    name: "for",
    branches: ["empty"],
    endTags: ["endfor"],
    branchDescriptions: {
      empty:
        "Marks the fallback section of a `{% for %}` loop, rendered only when the iterable is empty.",
    },
    branchReferences: {
      empty: `${builtinsReference}#for-empty`,
    },
    endTagDescriptions: {
      endfor: "Closes a `{% for %}` loop block.",
    },
    description: "Loops over each item in an iterable and renders the block for every item.",
    examples: [
      `{% for item in items %}
  {{ item }}
{% empty %}
  No items.
{% endfor %}`,
    ],
    reference: `${builtinsReference}#for`,
  },
  {
    name: "if",
    branches: ["elif", "else"],
    endTags: ["endif"],
    branchDescriptions: {
      elif: "Adds another condition to an `{% if %}` block when previous conditions did not match.",
      else: "Marks the fallback section of a conditional block when no previous condition matched.",
    },
    endTagDescriptions: {
      endif: "Closes an `{% if %}` conditional block.",
    },
    description: "Conditionally renders a block when an expression evaluates to true.",
    examples: [
      `{% if user.is_authenticated %}
  Welcome, {{ user.username }}.
{% elif user %}
  Welcome back.
{% else %}
  Please sign in.
{% endif %}`,
    ],
    reference: `${builtinsReference}#if`,
  },
  {
    name: "ifchanged",
    branches: ["else"],
    endTags: ["endifchanged"],
    branchDescriptions: {
      else: "Marks the fallback section of an `{% ifchanged %}` block, rendered when the tracked value has not changed.",
    },
    endTagDescriptions: {
      endifchanged: "Closes an `{% ifchanged %}` block.",
    },
    description:
      "Renders its block only when one or more values have changed since the previous loop iteration.",
    examples: [
      `{% for article in articles %}
  {% ifchanged article.category %}
    <h2>{{ article.category }}</h2>
  {% endifchanged %}
  {{ article.title }}
{% endfor %}`,
    ],
    reference: `${builtinsReference}#ifchanged`,
  },
  {
    name: "include",
    description:
      "Loads another template and renders it with the current context or an explicit context.",
    examples: [`{% include "partials/card.html" with item=item only %}`],
    reference: `${builtinsReference}#include`,
  },
  {
    name: "load",
    description: "Loads custom template tag and filter libraries for use in the current template.",
    examples: [`{% load static i18n %}`],
    reference: `${builtinsReference}#load`,
  },
  {
    name: "lorem",
    description: "Outputs random Latin placeholder text.",
    examples: [`{% lorem 2 p random %}`],
    reference: `${builtinsReference}#lorem`,
  },
  {
    name: "now",
    description:
      "Displays the current date or time using a format string or predefined date format.",
    examples: [`{% now "Y-m-d H:i" %}`],
    reference: `${builtinsReference}#now`,
  },
  {
    name: "regroup",
    description:
      "Regroups a list of objects by a shared attribute so it can be rendered in nested loops.",
    examples: [
      `{% regroup cities by country as country_list %}
{% for country in country_list %}
  <h2>{{ country.grouper }}</h2>
  {% for city in country.list %}{{ city.name }}{% endfor %}
{% endfor %}`,
    ],
    reference: `${builtinsReference}#regroup`,
  },
  {
    name: "resetcycle",
    description:
      "Resets a named or most recently used cycle so it starts from its first value again.",
    examples: [
      `{% cycle 'odd' 'even' as row_class %}
{% resetcycle row_class %}`,
    ],
    reference: `${builtinsReference}#resetcycle`,
  },
  {
    name: "spaceless",
    endTags: ["endspaceless"],
    endTagDescriptions: {
      endspaceless: "Closes a `{% spaceless %}` block whose inter-tag whitespace is removed.",
    },
    description: "Removes whitespace between HTML tags inside the block.",
    examples: [
      `{% spaceless %}
  <p>
    <a href="/">Home</a>
  </p>
{% endspaceless %}`,
    ],
    reference: `${builtinsReference}#spaceless`,
  },
  {
    name: "templatetag",
    description: "Outputs one of Django's template syntax characters as literal text.",
    examples: [`{% templatetag openblock %} comment {% templatetag closeblock %}`],
    reference: `${builtinsReference}#templatetag`,
  },
  {
    name: "url",
    description:
      "Resolves a URL path from a named URL pattern and optional positional or keyword arguments.",
    examples: [`<a href="{% url 'article-detail' article.pk %}">{{ article.title }}</a>`],
    reference: `${builtinsReference}#url`,
  },
  {
    name: "verbatim",
    endTags: ["endverbatim"],
    endTagDescriptions: {
      endverbatim: "Closes a `{% verbatim %}` block and resumes normal Django template parsing.",
    },
    description: "Prevents Django from interpreting template syntax inside the block.",
    examples: [
      `{% verbatim %}
  {{ handled_by_client_framework }}
{% endverbatim %}`,
    ],
    reference: `${builtinsReference}#verbatim`,
  },
  {
    name: "widthratio",
    description: "Calculates the ratio of one value to another and scales it to a maximum value.",
    examples: [`{% widthratio current max 100 %}`],
    reference: `${builtinsReference}#widthratio`,
  },
  {
    name: "with",
    endTags: ["endwith"],
    endTagDescriptions: {
      endwith: "Closes a `{% with %}` block and discards variables assigned only for that block.",
    },
    description: "Caches one or more values under simpler variable names within the block.",
    examples: [
      `{% with total=cart.items.count %}
  {{ total }} item{{ total|pluralize }}
{% endwith %}`,
    ],
    reference: `${builtinsReference}#with`,
  },
  {
    name: "static",
    load: "static",
    description:
      "Builds the absolute URL for a static asset using Django's configured static files storage.",
    examples: [
      `{% load static %}
<link rel="stylesheet" href="{% static 'css/site.css' %}">`,
    ],
    reference: `${builtinsReference}#static`,
  },
  {
    name: "get_static_prefix",
    load: "static",
    description: "Stores or outputs the configured STATIC_URL prefix.",
    examples: [
      `{% load static %}
{% get_static_prefix as STATIC_PREFIX %}
<img src="{{ STATIC_PREFIX }}images/logo.svg" alt="">`,
    ],
    reference: `${builtinsReference}#get-static-prefix`,
  },
  {
    name: "get_media_prefix",
    load: "static",
    description: "Stores or outputs the configured MEDIA_URL prefix.",
    examples: [
      `{% load static %}
{% get_media_prefix as MEDIA_PREFIX %}
<img src="{{ MEDIA_PREFIX }}{{ user.avatar }}" alt="">`,
    ],
    reference: `${builtinsReference}#get-media-prefix`,
  },
  {
    name: "translate",
    load: "i18n",
    description: "Marks a constant string for translation and outputs the translated text.",
    examples: [
      `{% load i18n %}
{% translate "Welcome" %}`,
    ],
    reference: `${translationReference}#translate-template-tag`,
  },
  {
    name: "trans",
    load: "i18n",
    deprecated: "Use `{% translate %}` instead.",
    description: "Deprecated alias for translating a constant string in templates.",
    examples: [
      `{% load i18n %}
{% trans "Welcome" %}`,
    ],
    reference: `${translationReference}#translate-template-tag`,
  },
  {
    name: "blocktranslate",
    load: "i18n",
    branches: ["plural"],
    endTags: ["endblocktranslate"],
    branchDescriptions: {
      plural:
        "Separates singular and plural text inside a `{% blocktranslate %}` translation block.",
    },
    endTagDescriptions: {
      endblocktranslate: "Closes a `{% blocktranslate %}` translation block.",
    },
    description:
      "Marks a template block for translation, with support for variables and plural forms.",
    examples: [
      `{% load i18n %}
{% blocktranslate count count=items|length %}
  There is {{ count }} item.
{% plural %}
  There are {{ count }} items.
{% endblocktranslate %}`,
    ],
    reference: `${translationReference}#blocktranslate-template-tag`,
  },
  {
    name: "blocktrans",
    load: "i18n",
    branches: ["plural"],
    endTags: ["endblocktrans"],
    branchDescriptions: {
      plural: "Separates singular and plural text inside a deprecated `{% blocktrans %}` block.",
    },
    endTagDescriptions: {
      endblocktrans: "Closes a deprecated `{% blocktrans %}` translation block.",
    },
    deprecated: "Use `{% blocktranslate %}` instead.",
    description:
      "Deprecated alias for translating a template block with variables or plural forms.",
    examples: [
      `{% load i18n %}
{% blocktrans %}Hello {{ name }}{% endblocktrans %}`,
    ],
    reference: `${translationReference}#blocktranslate-template-tag`,
  },
  {
    name: "get_available_languages",
    load: "i18n",
    description: "Stores the project's available languages in a template variable.",
    examples: [
      `{% load i18n %}
{% get_available_languages as LANGUAGES %}`,
    ],
    reference: `${translationReference}#get-available-languages`,
  },
  {
    name: "get_current_language",
    load: "i18n",
    description: "Stores the currently active language code in a template variable.",
    examples: [
      `{% load i18n %}
{% get_current_language as LANGUAGE_CODE %}`,
    ],
    reference: `${translationReference}#get-current-language`,
  },
  {
    name: "get_current_language_bidi",
    load: "i18n",
    description:
      "Stores whether the current language is written right-to-left in a template variable.",
    examples: [
      `{% load i18n %}
{% get_current_language_bidi as LANGUAGE_BIDI %}`,
    ],
    reference: `${translationReference}#get-current-language-bidi`,
  },
  {
    name: "get_language_info",
    load: "i18n",
    description: "Stores metadata about one language code, such as its translated and local names.",
    examples: [
      `{% load i18n %}
{% get_language_info for LANGUAGE_CODE as language %}
{{ language.name_local }}`,
    ],
    reference: `${translationReference}#get-language-info`,
  },
  {
    name: "get_language_info_list",
    load: "i18n",
    description: "Stores metadata for multiple languages in a template variable.",
    examples: [
      `{% load i18n %}
{% get_language_info_list for LANGUAGES as languages %}`,
    ],
    reference: `${translationReference}#get-language-info-list`,
  },
  {
    name: "localize",
    load: "l10n",
    endTags: ["endlocalize"],
    endTagDescriptions: {
      endlocalize:
        "Closes a `{% localize %}` block and restores the previous localization behavior.",
    },
    description: "Enables or disables localized formatting for values rendered inside the block.",
    examples: [
      `{% load l10n %}
{% localize off %}
  {{ value }}
{% endlocalize %}`,
    ],
    reference: `${formattingReference}#localize`,
  },
  {
    name: "localtime",
    load: "tz",
    endTags: ["endlocaltime"],
    endTagDescriptions: {
      endlocaltime:
        "Closes a `{% localtime %}` block and restores the previous local-time conversion behavior.",
    },
    description:
      "Enables or disables conversion of aware datetimes to the current time zone in the block.",
    examples: [
      `{% load tz %}
{% localtime on %}
  {{ value }}
{% endlocaltime %}`,
    ],
    reference: `${timezoneReference}#localtime`,
  },
  {
    name: "timezone",
    load: "tz",
    endTags: ["endtimezone"],
    endTagDescriptions: {
      endtimezone: "Closes a `{% timezone %}` block and restores the previous active time zone.",
    },
    description: "Sets the active time zone for datetimes rendered inside the block.",
    examples: [
      `{% load tz %}
{% timezone "Europe/Paris" %}
  {{ value }}
{% endtimezone %}`,
    ],
    reference: `${timezoneReference}#timezone`,
  },
  {
    name: "get_current_timezone",
    load: "tz",
    description: "Stores the name of the currently active time zone in a template variable.",
    examples: [
      `{% load tz %}
{% get_current_timezone as TIME_ZONE %}`,
    ],
    reference: `${timezoneReference}#get-current-timezone`,
  },
  {
    name: "cache",
    load: "cache",
    endTags: ["endcache"],
    endTagDescriptions: {
      endcache: "Closes a `{% cache %}` template fragment caching block.",
    },
    description: "Caches the rendered contents of a template fragment for a specified timeout.",
    examples: [
      `{% load cache %}
{% cache 500 sidebar request.user.username %}
  ... expensive sidebar ...
{% endcache %}`,
    ],
    reference: `${cacheReference}#template-fragment-caching`,
  },
  {
    name: "language",
    load: "i18n",
    endTags: ["endlanguage"],
    description: "Activates a translation language for everything rendered inside the block.",
    examples: [
      `{% load i18n %}
{% language "fr" %}
  {% translate "Welcome" %}
{% endlanguage %}`,
    ],
    reference: `${translationReference}#std-templatetag-language`,
  },
  {
    name: "ifequal",
    branches: ["else"],
    endTags: ["endifequal"],
    deprecated: "Use `{% if value == other %}` instead.",
    branchDescriptions: {
      else: "Marks the fallback section of a deprecated `{% ifequal %}` block.",
    },
    description: "Deprecated equality comparison block that renders when two values are equal.",
    examples: [
      `{% ifequal user.pk owner.pk %}
  Owner
{% else %}
  Visitor
{% endifequal %}`,
    ],
    reference: `${builtinsReference}#if`,
  },
  {
    name: "ifnotequal",
    branches: ["else"],
    endTags: ["endifnotequal"],
    deprecated: "Use `{% if value != other %}` instead.",
    branchDescriptions: {
      else: "Marks the fallback section of a deprecated `{% ifnotequal %}` block.",
    },
    description:
      "Deprecated inequality comparison block that renders when two values are not equal.",
    examples: [
      `{% ifnotequal user.pk owner.pk %}
  Visitor
{% else %}
  Owner
{% endifnotequal %}`,
    ],
    reference: `${builtinsReference}#if`,
  },
  {
    name: "partialdef",
    endTags: ["endpartialdef"],
    description:
      "Defines a named reusable template partial that can be rendered later with `{% partial %}`.",
    examples: [
      `{% partialdef card %}
  <article>{{ title }}</article>
{% endpartialdef %}`,
    ],
    reference: `${builtinsReference}#std-templatetag-partialdef`,
  },
  {
    name: "partial",
    description: "Renders a named template partial previously defined with `{% partialdef %}`.",
    examples: [`{% partial card %}`],
    reference: `${builtinsReference}#std-templatetag-partial`,
  },
  {
    name: "querystring",
    description:
      "Builds a query string from the current request query parameters plus additions or removals.",
    examples: [`<a href="{% querystring page=page.next_page_number %}">Next</a>`],
    reference: `${builtinsReference}#std-templatetag-querystring`,
  },
  {
    name: "csp_nonce_attr",
    description:
      "Outputs a Content Security Policy nonce attribute for external scripts, stylesheets, or Media assets.",
    examples: [
      `<script src="/path/to/script.js" {% csp_nonce_attr %}></script>
<link rel="stylesheet" href="/path/to/style.css" {% csp_nonce_attr %}>`,
    ],
    reference: cspNonceAttrReference,
  },
  {
    name: "thumbnail",
    load: "thumbnail",
    endTags: ["endthumbnail"],
    description:
      "Creates a resized image thumbnail and exposes the generated thumbnail object inside the block.",
    examples: [
      `{% load thumbnail %}
{% thumbnail photo.image "300x200" crop="center" as im %}
  <img src="{{ im.url }}" width="{{ im.width }}" height="{{ im.height }}" alt="">
{% endthumbnail %}`,
    ],
    reference: `${sorlThumbnailReference}#thumbnail`,
  },
  {
    name: "component",
    load: "component_tags",
    endTags: ["endcomponent"],
    description:
      "Renders a registered django-components component, optionally with nested slot fills.",
    examples: [
      `{% load component_tags %}
{% component "card" title=title %}
  {% fill "body" %}<p>{{ body }}</p>{% endfill %}
{% endcomponent %}`,
    ],
    reference: `${djangoComponentsReference}#component`,
  },
  {
    name: "component_block",
    load: "component_tags",
    endTags: ["endcomponent_block"],
    description:
      "Renders a django-components component using the legacy block-style component tag.",
    examples: [
      `{% load component_tags %}
{% component_block "card" title=title %}
  <p>{{ body }}</p>
{% endcomponent_block %}`,
    ],
    reference: djangoComponentsReference,
  },
  {
    name: "fill",
    load: "component_tags",
    endTags: ["endfill"],
    description: "Provides content for a named slot while rendering a django-components component.",
    examples: [
      `{% load component_tags %}
{% component "card" %}
  {% fill "footer" %}<button>Save</button>{% endfill %}
{% endcomponent %}`,
    ],
    reference: `${djangoComponentsReference}#fill`,
  },
  {
    name: "slot",
    load: "component_tags",
    endTags: ["endslot"],
    description: "Declares a named insertion point in a django-components component template.",
    examples: [
      `{% load component_tags %}
{% slot "footer" %}
  Default footer
{% endslot %}`,
    ],
    reference: `${djangoComponentsReference}#slot`,
  },
  {
    name: "provide",
    load: "component_tags",
    endTags: ["endprovide"],
    description: "Provides named context data that nested django-components components can inject.",
    examples: [
      `{% load component_tags %}
{% provide "theme" value="dark" %}
  {% component "card" / %}
{% endprovide %}`,
    ],
    reference: `${djangoComponentsReference}#provide`,
  },
  {
    name: "html_attrs",
    load: "component_tags",
    description:
      "Renders merged HTML attributes from dictionaries and keyword arguments in django-components templates.",
    examples: [
      `{% load component_tags %}
<div {% html_attrs attrs defaults:class="card" class="featured" data_id=item.id %}></div>`,
    ],
    reference: `${djangoComponentsReference}#html_attrs`,
  },
  {
    name: "component_css_dependencies",
    load: "component_tags",
    description:
      "Marks where django-components should insert generated component CSS dependencies.",
    examples: [
      `{% load component_tags %}
<head>{% component_css_dependencies %}</head>`,
    ],
    reference: `${djangoComponentsReference}#component_css_dependencies`,
  },
  {
    name: "component_js_dependencies",
    load: "component_tags",
    description:
      "Marks where django-components should insert generated component JavaScript dependencies.",
    examples: [
      `{% load component_tags %}
<body>{% component_js_dependencies %}</body>`,
    ],
    reference: `${djangoComponentsReference}#component_js_dependencies`,
  },
  {
    name: "compress",
    load: "compress",
    endTags: ["endcompress"],
    description:
      "Compresses and combines enclosed CSS or JavaScript assets with django-compressor.",
    examples: [
      `{% load compress %}
{% compress css %}
  <link rel="stylesheet" href="{% static 'css/app.css' %}">
{% endcompress %}`,
    ],
    reference: djangoCompressorReference,
  },
  {
    name: "addtoblock",
    load: "sekizai_tags",
    endTags: ["endaddtoblock"],
    description:
      "Adds the enclosed content to a named django-sekizai block for rendering elsewhere.",
    examples: [
      `{% load sekizai_tags %}
{% addtoblock "js" %}<script src="/static/app.js"></script>{% endaddtoblock %}`,
    ],
    reference: djangoSekizaiReference,
  },
  {
    name: "with_data",
    load: "sekizai_tags",
    endTags: ["endwith_data"],
    description: "Temporarily exposes named sekizai data while rendering the block contents.",
    examples: [
      `{% load sekizai_tags %}
{% with_data "nav" items=items %}
  <nav>{{ items|length }}</nav>
{% endwith_data %}`,
    ],
    reference: djangoSekizaiReference,
  },
  {
    name: "render_block",
    load: "sekizai_tags",
    description: "Renders a named django-sekizai block where collected content should appear.",
    examples: [
      `{% load sekizai_tags %}
{% render_block "js" %}`,
    ],
    reference: djangoSekizaiReference,
  },
  {
    name: "add_data",
    load: "sekizai_tags",
    description: "Adds a value to named django-sekizai data without rendering block content.",
    examples: [
      `{% load sekizai_tags %}
{% add_data "body-class" "dashboard" %}`,
    ],
    reference: djangoSekizaiReference,
  },
  {
    name: "flag",
    load: "waffle_tags",
    branches: ["else"],
    endTags: ["endflag"],
    branchDescriptions: {
      else: "Marks fallback content for a django-waffle `{% flag %}` block when the flag is inactive.",
    },
    description: "Conditionally renders a block when a django-waffle feature flag is active.",
    examples: [
      `{% load waffle_tags %}
{% flag "new_nav" %}
  <nav>New navigation</nav>
{% else %}
  <nav>Old navigation</nav>
{% endflag %}`,
    ],
    reference: `${djangoWaffleReference}#flags`,
  },
  {
    name: "switch",
    load: "waffle_tags",
    endTags: ["endswitch"],
    description: "Conditionally renders a block when a django-waffle switch is active.",
    examples: [
      `{% load waffle_tags %}
{% switch "beta_checkout" %}
  <button>Checkout</button>
{% endswitch %}`,
    ],
    reference: `${djangoWaffleReference}#switches`,
  },
  {
    name: "sample",
    load: "waffle_tags",
    endTags: ["endsample"],
    description: "Conditionally renders a block for users included in a django-waffle sample.",
    examples: [
      `{% load waffle_tags %}
{% sample "hero_test" %}
  <h1>Variant A</h1>
{% endsample %}`,
    ],
    reference: `${djangoWaffleReference}#samples`,
  },
  {
    name: "wafflejs",
    load: "waffle_tags",
    description:
      "Outputs django-waffle JavaScript helpers and active flag, switch, or sample state.",
    examples: [
      `{% load waffle_tags %}
{% wafflejs %}`,
    ],
    reference: djangoWaffleReference,
  },
  {
    name: "recursetree",
    load: "mptt_tags",
    endTags: ["endrecursetree"],
    description:
      "Recursively renders a django-mptt tree, exposing each node and its rendered children.",
    examples: [
      `{% load mptt_tags %}
{% recursetree nodes %}
  <li>{{ node.name }}{% if not node.is_leaf_node %}<ul>{{ children }}</ul>{% endif %}</li>
{% endrecursetree %}`,
    ],
    reference: `${djangoMpttReference}#recursetree`,
  },
  {
    name: "drilldown_tree_for_node",
    load: "mptt_tags",
    description:
      "Builds a django-mptt drilldown tree for a selected node and stores it in a variable.",
    examples: [
      `{% load mptt_tags %}
{% drilldown_tree_for_node node as drilldown %}`,
    ],
    reference: `${djangoMpttReference}#drilldown-tree-for-node`,
  },
  {
    name: "full_tree_for_model",
    load: "mptt_tags",
    description:
      "Loads the full django-mptt tree for a model and stores it in a template variable.",
    examples: [
      `{% load mptt_tags %}
{% full_tree_for_model app.Model as tree %}`,
    ],
    reference: `${djangoMpttReference}#full-tree-for-model`,
  },
  {
    name: "placeholder",
    load: "cms_tags",
    endTags: ["endplaceholder"],
    description: "Defines or renders an editable django CMS placeholder in a page template.",
    examples: [
      `{% load cms_tags %}
{% placeholder "content" %}
  <section>{{ content }}</section>
{% endplaceholder %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "static_placeholder",
    load: "cms_tags",
    endTags: ["endstatic_placeholder"],
    description: "Defines or renders a django CMS placeholder shared across pages.",
    examples: [
      `{% load cms_tags %}
{% static_placeholder "footer" %}
  <footer>Footer</footer>
{% endstatic_placeholder %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_model_block",
    load: "cms_tags",
    endTags: ["endrender_model_block"],
    description:
      "Wraps markup that should be editable as a django CMS model field in structure mode.",
    examples: [
      `{% load cms_tags %}
{% render_model_block object "title" %}
  <h1>{{ object.title }}</h1>
{% endrender_model_block %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_model_add_block",
    load: "cms_tags",
    endTags: ["endrender_model_add_block"],
    description: "Wraps markup with django CMS controls for adding a related model instance.",
    examples: [
      `{% load cms_tags %}
{% render_model_add_block object %}
  <span>Add</span>
{% endrender_model_add_block %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_plugin_block",
    load: "cms_tags",
    endTags: ["endrender_plugin_block"],
    description:
      "Wraps custom rendering for a django CMS plugin while preserving plugin editing controls.",
    examples: [
      `{% load cms_tags %}
{% render_plugin_block plugin %}
  <article>{{ plugin }}</article>
{% endrender_plugin_block %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "cms_admin_url",
    load: "cms_tags",
    description: "Builds a django CMS admin URL for the supplied model object and action.",
    examples: [
      `{% load cms_tags %}
<a href="{% cms_admin_url object 'change' %}">Edit</a>`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "page_attribute",
    load: "cms_tags",
    description: "Outputs an attribute from the current django CMS page or another supplied page.",
    examples: [
      `{% load cms_tags %}
{% page_attribute "page_title" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "page_url",
    load: "cms_tags",
    description:
      "Outputs the URL for the current django CMS page or a page identified by reverse ID.",
    examples: [
      `{% load cms_tags %}
<a href="{% page_url 'home' %}">Home</a>`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "page_id_url",
    load: "cms_tags",
    description: "Outputs the URL for a django CMS page by numeric page ID.",
    examples: [
      `{% load cms_tags %}
<a href="{% page_id_url 1 %}">Home</a>`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "page_language_url",
    load: "cms_tags",
    description: "Outputs the URL for the current django CMS page in another language.",
    examples: [
      `{% load cms_tags %}
<a href="{% page_language_url 'de' %}">Deutsch</a>`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_model",
    load: "cms_tags",
    description: "Renders a model field with django CMS frontend editing markup.",
    examples: [
      `{% load cms_tags %}
{% render_model object "title" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_model_icon",
    load: "cms_tags",
    description: "Renders only the django CMS frontend editing icon for a model field.",
    examples: [
      `{% load cms_tags %}
{% render_model_icon object "title" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_model_add",
    load: "cms_tags",
    description: "Renders a django CMS frontend editing control for adding a related model object.",
    examples: [
      `{% load cms_tags %}
{% render_model_add object %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_placeholder",
    load: "cms_tags",
    description:
      "Renders a django CMS placeholder by name, usually from a page or placeholder object.",
    examples: [
      `{% load cms_tags %}
{% render_placeholder page "content" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_uncached_placeholder",
    load: "cms_tags",
    description: "Renders a django CMS placeholder without using placeholder cache output.",
    examples: [
      `{% load cms_tags %}
{% render_uncached_placeholder page "content" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "render_plugin",
    load: "cms_tags",
    description: "Renders a django CMS plugin instance from a template.",
    examples: [
      `{% load cms_tags %}
{% render_plugin plugin %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "show_placeholder",
    load: "cms_tags",
    description: "Renders a named placeholder from another django CMS page.",
    examples: [
      `{% load cms_tags %}
{% show_placeholder "content" "home" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "static_alias",
    load: "cms_tags",
    description: "Renders a django CMS static placeholder by alias.",
    examples: [
      `{% load cms_tags %}
{% static_alias "footer" %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "cms_toolbar",
    load: "cms_tags",
    description:
      "Renders django CMS toolbar markup for templates that include the toolbar manually.",
    examples: [
      `{% load cms_tags %}
{% cms_toolbar %}`,
    ],
    reference: djangoCmsReference,
  },
  {
    name: "element",
    load: "allauth",
    endTags: ["endelement"],
    description:
      "Renders a django-allauth template element with consistent attributes and nested content.",
    examples: [
      `{% load allauth %}
{% element button type="submit" %}
  Continue
{% endelement %}`,
    ],
    reference: `${djangoAllauthReference}#elements`,
  },
  {
    name: "crispy",
    load: "crispy_forms_tags",
    description:
      "Renders a form or formset using django-crispy-forms layout and helper configuration.",
    examples: [
      `{% load crispy_forms_tags %}
{% crispy form %}`,
    ],
    reference: djangoCrispyFormsReference,
  },
  {
    name: "crispy_field",
    load: "crispy_forms_tags",
    description: "Renders one form field using django-crispy-forms field template handling.",
    examples: [
      `{% load crispy_forms_tags %}
{% crispy_field form.email %}`,
    ],
    reference: djangoCrispyFormsReference,
  },
  {
    name: "crispy_addon",
    load: "crispy_forms_tags",
    endTags: ["endcrispy_addon"],
    description: "Wraps a crispy form field with prepended or appended addon markup.",
    examples: [
      `{% load crispy_forms_tags %}
{% crispy_addon form.email append="@example.com" %}
  {{ form.email }}
{% endcrispy_addon %}`,
    ],
    reference: djangoCrispyFormsReference,
  },
];

export const djangoTagDocsByName = new Map<string, DjangoTagDoc>();

for (const doc of djangoTagDocs) {
  const relatedTags = [
    doc.name,
    ...(doc.aliases ?? []),
    ...(doc.branches ?? []),
    ...(doc.endTags ?? []),
  ];

  registerTagDoc(doc.name, doc, relatedTags);

  for (const alias of doc.aliases ?? []) {
    registerTagDoc(alias, doc, relatedTags);
  }

  for (const branch of doc.branches ?? []) {
    registerTagDoc(branch, doc, relatedTags, {
      description: doc.branchDescriptions?.[branch],
      reference: doc.branchReferences?.[branch],
    });
  }

  for (const endTag of doc.endTags ?? []) {
    registerTagDoc(endTag, doc, relatedTags, {
      description: doc.endTagDescriptions?.[endTag] ?? `Closes a \`{% ${doc.name} %}\` block.`,
      reference: doc.endTagReferences?.[endTag],
    });
  }
}

function registerTagDoc(
  name: string,
  doc: DjangoTagDoc,
  relatedTags: string[],
  overrides: Partial<Pick<DjangoTagDoc, "description" | "reference">> = {},
): void {
  const lookupDoc: DjangoTagDoc = {
    ...doc,
    ...overrides,
    name,
    description: overrides.description ?? doc.description,
    reference: overrides.reference ?? doc.reference,
    relatedTags: relatedTags.filter((relatedTag) => relatedTag !== name),
  };
  const existingDoc = djangoTagDocsByName.get(name);

  if (!existingDoc) {
    djangoTagDocsByName.set(name, lookupDoc);
    return;
  }

  djangoTagDocsByName.set(name, {
    ...existingDoc,
    relatedTags: Array.from(
      new Set([...(existingDoc.relatedTags ?? []), ...(lookupDoc.relatedTags ?? [])]),
    ),
  });
}
