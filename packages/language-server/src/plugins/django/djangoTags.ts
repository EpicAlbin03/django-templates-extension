export interface DjangoTagDoc {
  name: string;
  aliases?: string[];
  endTags?: string[];
  branches?: string[];
  load?: string;
  deprecated?: string;
  description: string;
  examples: string[];
  reference?: string;
}

const builtinsReference = "https://docs.djangoproject.com/en/stable/ref/templates/builtins/";
const staticReference = "https://docs.djangoproject.com/en/stable/ref/contrib/staticfiles/";
const i18nReference =
  "https://docs.djangoproject.com/en/stable/topics/i18n/translation/#internationalization-in-template-code";
const l10nReference = "https://docs.djangoproject.com/en/stable/topics/i18n/formatting/";
const timezoneReference =
  "https://docs.djangoproject.com/en/stable/topics/i18n/timezones/#time-zone-aware-output-in-templates";
const cacheReference =
  "https://docs.djangoproject.com/en/stable/topics/cache/#template-fragment-caching";

export const djangoTagDocs: DjangoTagDoc[] = [
  {
    name: "autoescape",
    endTags: ["endautoescape"],
    description: "Controls whether automatic HTML escaping is enabled inside the block.",
    examples: [
      `{% autoescape off %}
  {{ trusted_html }}
{% endautoescape %}`,
    ],
    reference: `${builtinsReference}autoescape`,
  },
  {
    name: "block",
    endTags: ["endblock"],
    description:
      "Defines a named block that child templates can override when using template inheritance.",
    examples: [
      `{% block content %}
  <h1>{{ title }}</h1>
{% endblock %}`,
    ],
    reference: `${builtinsReference}block`,
  },
  {
    name: "comment",
    endTags: ["endcomment"],
    description:
      "Ignores everything between the opening and closing tag during template rendering.",
    examples: [
      `{% comment "Optional note" %}
  This will not be rendered.
{% endcomment %}`,
    ],
    reference: `${builtinsReference}comment`,
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
    reference: `${builtinsReference}csrf-token`,
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
    reference: `${builtinsReference}cycle`,
  },
  {
    name: "debug",
    description:
      "Outputs debugging information, including the current context and imported modules.",
    examples: [`{% debug %}`],
    reference: `${builtinsReference}debug`,
  },
  {
    name: "extends",
    description: "Makes the current template inherit from a parent template.",
    examples: [`{% extends "base.html" %}`],
    reference: `${builtinsReference}extends`,
  },
  {
    name: "filter",
    endTags: ["endfilter"],
    description: "Applies one or more template filters to the contents of the block.",
    examples: [
      `{% filter force_escape|lower %}
  {{ user_input }}
{% endfilter %}`,
    ],
    reference: `${builtinsReference}filter`,
  },
  {
    name: "firstof",
    description: "Outputs the first variable or literal argument that evaluates to true.",
    examples: [`{% firstof user.get_full_name user.username "Anonymous" %}`],
    reference: `${builtinsReference}firstof`,
  },
  {
    name: "for",
    branches: ["empty"],
    endTags: ["endfor"],
    description: "Loops over each item in an iterable and renders the block for every item.",
    examples: [
      `{% for item in items %}
  {{ item }}
{% empty %}
  No items.
{% endfor %}`,
    ],
    reference: `${builtinsReference}for`,
  },
  {
    name: "if",
    branches: ["elif", "else"],
    endTags: ["endif"],
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
    reference: `${builtinsReference}if`,
  },
  {
    name: "ifchanged",
    branches: ["else"],
    endTags: ["endifchanged"],
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
    reference: `${builtinsReference}ifchanged`,
  },
  {
    name: "include",
    description:
      "Loads another template and renders it with the current context or an explicit context.",
    examples: [`{% include "partials/card.html" with item=item only %}`],
    reference: `${builtinsReference}include`,
  },
  {
    name: "load",
    description: "Loads custom template tag and filter libraries for use in the current template.",
    examples: [`{% load static i18n %}`],
    reference: `${builtinsReference}load`,
  },
  {
    name: "lorem",
    description: "Outputs random Latin placeholder text.",
    examples: [`{% lorem 2 p random %}`],
    reference: `${builtinsReference}lorem`,
  },
  {
    name: "now",
    description:
      "Displays the current date or time using a format string or predefined date format.",
    examples: [`{% now "Y-m-d H:i" %}`],
    reference: `${builtinsReference}now`,
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
    reference: `${builtinsReference}regroup`,
  },
  {
    name: "resetcycle",
    description:
      "Resets a named or most recently used cycle so it starts from its first value again.",
    examples: [
      `{% cycle 'odd' 'even' as row_class %}
{% resetcycle row_class %}`,
    ],
    reference: `${builtinsReference}resetcycle`,
  },
  {
    name: "spaceless",
    endTags: ["endspaceless"],
    description: "Removes whitespace between HTML tags inside the block.",
    examples: [
      `{% spaceless %}
  <p>
    <a href="/">Home</a>
  </p>
{% endspaceless %}`,
    ],
    reference: `${builtinsReference}spaceless`,
  },
  {
    name: "templatetag",
    description: "Outputs one of Django's template syntax characters as literal text.",
    examples: [`{% templatetag openblock %} comment {% templatetag closeblock %}`],
    reference: `${builtinsReference}templatetag`,
  },
  {
    name: "url",
    description:
      "Resolves a URL path from a named URL pattern and optional positional or keyword arguments.",
    examples: [`<a href="{% url 'article-detail' article.pk %}">{{ article.title }}</a>`],
    reference: `${builtinsReference}url`,
  },
  {
    name: "verbatim",
    endTags: ["endverbatim"],
    description: "Prevents Django from interpreting template syntax inside the block.",
    examples: [
      `{% verbatim %}
  {{ handled_by_client_framework }}
{% endverbatim %}`,
    ],
    reference: `${builtinsReference}verbatim`,
  },
  {
    name: "widthratio",
    description: "Calculates the ratio of one value to another and scales it to a maximum value.",
    examples: [`{% widthratio current max 100 %}`],
    reference: `${builtinsReference}widthratio`,
  },
  {
    name: "with",
    endTags: ["endwith"],
    description: "Caches one or more values under simpler variable names within the block.",
    examples: [
      `{% with total=cart.items.count %}
  {{ total }} item{{ total|pluralize }}
{% endwith %}`,
    ],
    reference: `${builtinsReference}with`,
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
    reference: `${staticReference}static-template-tag`,
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
    reference: `${builtinsReference}get-static-prefix`,
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
    reference: `${builtinsReference}get-media-prefix`,
  },
  {
    name: "translate",
    load: "i18n",
    description: "Marks a constant string for translation and outputs the translated text.",
    examples: [
      `{% load i18n %}
{% translate "Welcome" %}`,
    ],
    reference: i18nReference,
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
    reference: i18nReference,
  },
  {
    name: "blocktranslate",
    load: "i18n",
    branches: ["plural"],
    endTags: ["endblocktranslate"],
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
    reference: i18nReference,
  },
  {
    name: "blocktrans",
    load: "i18n",
    branches: ["plural"],
    endTags: ["endblocktrans"],
    deprecated: "Use `{% blocktranslate %}` instead.",
    description:
      "Deprecated alias for translating a template block with variables or plural forms.",
    examples: [
      `{% load i18n %}
{% blocktrans %}Hello {{ name }}{% endblocktrans %}`,
    ],
    reference: i18nReference,
  },
  {
    name: "get_available_languages",
    load: "i18n",
    description: "Stores the project's available languages in a template variable.",
    examples: [
      `{% load i18n %}
{% get_available_languages as LANGUAGES %}`,
    ],
    reference: i18nReference,
  },
  {
    name: "get_current_language",
    load: "i18n",
    description: "Stores the currently active language code in a template variable.",
    examples: [
      `{% load i18n %}
{% get_current_language as LANGUAGE_CODE %}`,
    ],
    reference: i18nReference,
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
    reference: i18nReference,
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
    reference: i18nReference,
  },
  {
    name: "get_language_info_list",
    load: "i18n",
    description: "Stores metadata for multiple languages in a template variable.",
    examples: [
      `{% load i18n %}
{% get_language_info_list for LANGUAGES as languages %}`,
    ],
    reference: i18nReference,
  },
  {
    name: "localize",
    load: "l10n",
    endTags: ["endlocalize"],
    description: "Enables or disables localized formatting for values rendered inside the block.",
    examples: [
      `{% load l10n %}
{% localize off %}
  {{ value }}
{% endlocalize %}`,
    ],
    reference: l10nReference,
  },
  {
    name: "localtime",
    load: "tz",
    endTags: ["endlocaltime"],
    description:
      "Enables or disables conversion of aware datetimes to the current time zone in the block.",
    examples: [
      `{% load tz %}
{% localtime on %}
  {{ value }}
{% endlocaltime %}`,
    ],
    reference: timezoneReference,
  },
  {
    name: "timezone",
    load: "tz",
    endTags: ["endtimezone"],
    description: "Sets the active time zone for datetimes rendered inside the block.",
    examples: [
      `{% load tz %}
{% timezone "Europe/Paris" %}
  {{ value }}
{% endtimezone %}`,
    ],
    reference: timezoneReference,
  },
  {
    name: "get_current_timezone",
    load: "tz",
    description: "Stores the name of the currently active time zone in a template variable.",
    examples: [
      `{% load tz %}
{% get_current_timezone as TIME_ZONE %}`,
    ],
    reference: timezoneReference,
  },
  {
    name: "cache",
    load: "cache",
    endTags: ["endcache"],
    description: "Caches the rendered contents of a template fragment for a specified timeout.",
    examples: [
      `{% load cache %}
{% cache 500 sidebar request.user.username %}
  ... expensive sidebar ...
{% endcache %}`,
    ],
    reference: cacheReference,
  },
];

export const djangoTagDocsByName = new Map<string, DjangoTagDoc>();

for (const doc of djangoTagDocs) {
  for (const name of [
    doc.name,
    ...(doc.aliases ?? []),
    ...(doc.branches ?? []),
    ...(doc.endTags ?? []),
  ]) {
    if (!djangoTagDocsByName.has(name)) {
      djangoTagDocsByName.set(name, doc);
    }
  }
}
