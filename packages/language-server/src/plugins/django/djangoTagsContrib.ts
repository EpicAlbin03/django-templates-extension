import type { DjangoTagDoc } from "./djangoTagTypes.js";

// Django references
const builtinsReference = "https://docs.djangoproject.com/en/6.0/ref/templates/builtins/";
const translationReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/translation/";
const formattingReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/formatting/";
const timezoneReference = "https://docs.djangoproject.com/en/6.0/topics/i18n/timezones/";
const cacheReference = "https://docs.djangoproject.com/en/6.0/topics/cache/";

export const djangoContribTagDocs: DjangoTagDoc[] = [
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
];
