import type { DjangoFilterDoc } from "./djangoFilterTypes.js";

const DJANGO_BUILTIN_FILTERS_URL = "https://docs.djangoproject.com/en/6.0/ref/templates/builtins/";
const DJANGO_I18N_FILTERS_URL = "https://docs.djangoproject.com/en/6.0/topics/i18n/translation/";
const DJANGO_L10N_FILTERS_URL = "https://docs.djangoproject.com/en/6.0/topics/i18n/formatting/";
const DJANGO_TIMEZONE_FILTERS_URL = "https://docs.djangoproject.com/en/6.0/topics/i18n/timezones/";
const DJANGO_HUMANIZE_FILTERS_URL = "https://docs.djangoproject.com/en/6.0/ref/contrib/humanize/";
const MPTT_FILTERS_URL = "https://django-mptt.readthedocs.io/en/stable/templates.html";
const CRISPY_FORMS_FILTERS_URL =
  "https://django-crispy-forms.readthedocs.io/en/latest/api_templatetags.html";
const SORL_THUMBNAIL_FILTERS_URL = "https://sorl-thumbnail.readthedocs.io/en/12.8.0/template.html";
const SORL_THUMBNAIL_LEGACY_FILTERS_URL =
  "https://sorl-thumbnail.readthedocs.io/en/latest/examples.html";

function djangoBuiltinFilter(name: string, description: string): DjangoFilterDoc {
  return {
    name,
    description,
    reference: `${DJANGO_BUILTIN_FILTERS_URL}#std-templatefilter-${name}`,
  };
}

function libraryFilter(
  name: string,
  description: string,
  load: string,
  reference: string,
): DjangoFilterDoc {
  return { name, description, load, reference };
}

const FILTER_EXAMPLES: Partial<Record<string, string[]>> = {
  join: ['{{ names|join:", " }}'],
  escapejs: ['<script>const message = "{{ message|escapejs }}";</script>'],
  floatformat: ['{{ price|floatformat:"2" }}'],
  make_list: ["{{ value|make_list }}"],
  stringformat: ['{{ value|stringformat:"E" }}'],
  truncatechars: ["{{ summary|truncatechars:80 }}"],
  truncatechars_html: ["{{ article_html|truncatechars_html:200 }}"],
  truncatewords: ["{{ summary|truncatewords:20 }}"],
  truncatewords_html: ["{{ article_html|truncatewords_html:20 }}"],
  urlencode: ['{{ path|urlencode:"" }}'],
  urlizetrunc: ["{{ message|urlizetrunc:30 }}"],
  wordwrap: ["{{ message|wordwrap:80 }}"],
  ljust: ["{{ label|ljust:20 }}"],
  rjust: ["{{ label|rjust:20 }}"],
  center: ["{{ heading|center:40 }}"],
  cut: ['{{ value|cut:" " }}'],
  safeseq: ['{{ values|safeseq|join:", " }}'],
  dictsort: ['{% for item in items|dictsort:"name" %}{{ item.name }}{% endfor %}'],
  dictsortreversed: ['{% for item in items|dictsortreversed:"name" %}{{ item.name }}{% endfor %}'],
  length_is: ["{% if items|length_is:3 %}Exactly three items{% endif %}"],
  slice: ['{{ items|slice:":5" }}'],
  unordered_list: ["{{ nested_items|unordered_list }}"],
  add: ['{{ value|add:"2" }}'],
  get_digit: ['{{ value|get_digit:"2" }}'],
  date: ['{{ published_at|date:"Y-m-d" }}'],
  time: ['{{ starts_at|time:"H:i" }}'],
  timesince: ["{{ published_at|timesince }}"],
  timeuntil: ["{{ event.starts_at|timeuntil }}"],
  default: ['{{ value|default:"Nothing to display" }}'],
  default_if_none: ['{{ value|default_if_none:"Not provided" }}'],
  divisibleby: ['{% if row_number|divisibleby:"2" %}even{% endif %}'],
  yesno: ['{{ is_published|yesno:"Published,Draft,Unknown" }}'],
  pluralize: ["{{ count }} item{{ count|pluralize }}"],
  escapeseq: ['{{ values|escapeseq|join:", " }}'],
  json_script: ['{{ payload|json_script:"page-data" }}'],
  language_name: ["{{ language_code|language_name }}"],
  language_name_local: ["{{ language_code|language_name_local }}"],
  language_bidi: ["{% if language_code|language_bidi %}rtl{% else %}ltr{% endif %}"],
  language_name_translated: ["{{ language_code|language_name_translated }}"],
  localize: ["{{ amount|localize }}"],
  unlocalize: ["{{ amount|unlocalize }}"],
  localtime: ["{{ event.starts_at|localtime }}"],
  utc: ["{{ event.starts_at|utc }}"],
  timezone: ['{{ event.starts_at|timezone:"Europe/Paris" }}'],
  apnumber: ["{{ position|apnumber }}"],
  intcomma: ["{{ population|intcomma }}"],
  intword: ["{{ population|intword }}"],
  naturalday: ["{{ event.date|naturalday }}"],
  naturaltime: ["{{ event.starts_at|naturaltime }}"],
  ordinal: ["{{ position|ordinal }}"],
  tree_info: ["{% for node, structure in nodes|tree_info %}{{ node.name }}{% endfor %}"],
  tree_path: ['{{ node.get_ancestors|tree_path:" > " }}'],
  crispy: ["{{ form|crispy }}"],
  as_crispy_errors: ["{{ form|as_crispy_errors }}"],
  as_crispy_field: ["{{ form.email|as_crispy_field }}"],
  flatatt: ["{{ attrs|flatatt }}"],
  optgroups: ["{% for group in field|optgroups %}{{ group }}{% endfor %}"],
  resolution: ['{{ thumbnail.url|resolution:"2x" }}'],
  is_portrait: ["{% if image|is_portrait %}portrait{% endif %}"],
  margin: ['{{ image|margin:"100x100" }}'],
  background_margin: ['{{ image|background_margin:"100x100" }}'],
  markdown_thumbnails: ["{{ markdown|markdown_thumbnails }}"],
  html_thumbnails: ["{{ html|html_thumbnails }}"],
};

const djangoFilterDocsWithoutExamples: DjangoFilterDoc[] = [
  djangoBuiltinFilter("join", "Joins a sequence using the supplied separator."),
  djangoBuiltinFilter("addslashes", "Adds backslashes before quotation marks."),
  djangoBuiltinFilter("capfirst", "Capitalizes the first character of a value."),
  djangoBuiltinFilter(
    "escapejs",
    "Escapes characters for use inside a quoted JavaScript string literal.",
  ),
  djangoBuiltinFilter(
    "floatformat",
    "Rounds and formats a number using the requested number of decimal places.",
  ),
  djangoBuiltinFilter("iriencode", "Converts an IRI into a value suitable for use in a URL."),
  djangoBuiltinFilter("linenumbers", "Displays text with line numbers."),
  djangoBuiltinFilter("lower", "Converts a string into all lowercase."),
  djangoBuiltinFilter("make_list", "Converts a value into a list of its characters."),
  djangoBuiltinFilter(
    "slugify",
    "Converts a value to lowercase ASCII, replacing spaces with hyphens and removing unsupported characters.",
  ),
  djangoBuiltinFilter(
    "stringformat",
    "Formats a value using a printf-style formatting specifier without the leading percent sign.",
  ),
  djangoBuiltinFilter("title", "Converts a string to title case."),
  djangoBuiltinFilter(
    "truncatechars",
    "Truncates a string to the requested number of characters and adds an ellipsis when needed.",
  ),
  djangoBuiltinFilter(
    "truncatechars_html",
    "Truncates HTML by character count while preserving and closing open tags.",
  ),
  djangoBuiltinFilter("truncatewords", "Truncates a string after the requested number of words."),
  djangoBuiltinFilter(
    "truncatewords_html",
    "Truncates HTML after the requested number of words while preserving and closing open tags.",
  ),
  djangoBuiltinFilter("upper", "Converts a string into all uppercase."),
  djangoBuiltinFilter("urlencode", "Escapes a value for use in a URL."),
  djangoBuiltinFilter("urlize", "Converts URLs and email addresses in plain text into links."),
  djangoBuiltinFilter(
    "urlizetrunc",
    "Converts URLs and email addresses into links while truncating long link text.",
  ),
  djangoBuiltinFilter("wordcount", "Returns the number of words in a value."),
  djangoBuiltinFilter("wordwrap", "Wraps words at the requested line length."),
  djangoBuiltinFilter("ljust", "Left-aligns a value in a field of the requested width."),
  djangoBuiltinFilter("rjust", "Right-aligns a value in a field of the requested width."),
  djangoBuiltinFilter("center", "Centers a value in a field of the requested width."),
  djangoBuiltinFilter("cut", "Removes every occurrence of the supplied value from a string."),
  djangoBuiltinFilter("escape", "Escapes HTML-sensitive characters in a string."),
  djangoBuiltinFilter("force_escape", "Applies HTML escaping immediately and returns the result."),
  djangoBuiltinFilter(
    "linebreaks",
    "Converts line breaks in plain text into HTML paragraphs and line breaks.",
  ),
  djangoBuiltinFilter("linebreaksbr", "Converts every newline into an HTML line break."),
  djangoBuiltinFilter("safe", "Marks a string as not requiring further HTML escaping."),
  djangoBuiltinFilter("safeseq", "Marks each element of a sequence as safe from HTML escaping."),
  djangoBuiltinFilter("striptags", "Attempts to remove all HTML and XML tags from a value."),
  djangoBuiltinFilter(
    "dictsort",
    "Sorts a list of dictionaries or objects by the supplied lookup key.",
  ),
  djangoBuiltinFilter(
    "dictsortreversed",
    "Sorts a list of dictionaries or objects in reverse order by the supplied lookup key.",
  ),
  djangoBuiltinFilter("first", "Returns the first item in a sequence."),
  djangoBuiltinFilter("last", "Returns the last item in a sequence."),
  djangoBuiltinFilter("length", "Returns the length of a string or sequence."),
  {
    name: "length_is",
    description: "Returns whether the value's length equals the supplied argument.",
    reference:
      "https://docs.djangoproject.com/en/3.2/ref/templates/builtins/#std-templatefilter-length_is",
    deprecated: "Removed in Django 4.0. Available only in older Django releases.",
  },
  djangoBuiltinFilter("random", "Returns a random item from a sequence."),
  djangoBuiltinFilter("slice", "Returns a slice of a sequence using Python slice syntax."),
  djangoBuiltinFilter(
    "unordered_list",
    "Converts a recursively nested list into HTML list items and nested unordered lists.",
  ),
  djangoBuiltinFilter(
    "add",
    "Adds the supplied argument to a value, coercing both values to integers when possible.",
  ),
  djangoBuiltinFilter("get_digit", "Returns a requested digit from a whole number."),
  djangoBuiltinFilter("date", "Formats a date using Django's date format syntax."),
  djangoBuiltinFilter("time", "Formats a time using Django's time format syntax."),
  djangoBuiltinFilter("timesince", "Formats a date as the elapsed time since that date."),
  djangoBuiltinFilter("timeuntil", "Formats a date as the remaining time until that date."),
  djangoBuiltinFilter(
    "default",
    "Uses the supplied default when the value evaluates to false. Otherwise, returns the value.",
  ),
  djangoBuiltinFilter(
    "default_if_none",
    "Uses the supplied default only when the value is `None`. Otherwise, returns the value.",
  ),
  djangoBuiltinFilter("divisibleby", "Returns whether the value is divisible by the argument."),
  djangoBuiltinFilter(
    "yesno",
    "Maps true, false, and optionally `None` to a configurable comma-separated set of strings.",
  ),
  djangoBuiltinFilter("filesizeformat", "Formats a byte count as a human-readable file size."),
  djangoBuiltinFilter(
    "pluralize",
    "Returns a plural suffix when a value does not represent exactly one item.",
  ),
  djangoBuiltinFilter(
    "phone2numeric",
    "Converts letters in a phone number to their numeric keypad equivalents.",
  ),
  djangoBuiltinFilter("pprint", "Formats a value for debugging using Python's pretty printer."),
  djangoBuiltinFilter("escapeseq", "Applies HTML escaping to every element of a sequence."),
  djangoBuiltinFilter(
    "json_script",
    "Safely serializes a value as JSON inside a script element for JavaScript to consume.",
  ),
  libraryFilter(
    "language_name",
    "Returns the language name for a language code.",
    "i18n",
    `${DJANGO_I18N_FILTERS_URL}#std-templatefilter-language_name`,
  ),
  libraryFilter(
    "language_name_local",
    "Returns the localized language name for a language code in that language.",
    "i18n",
    `${DJANGO_I18N_FILTERS_URL}#std-templatefilter-language_name_local`,
  ),
  libraryFilter(
    "language_bidi",
    "Returns whether a language code uses right-to-left writing.",
    "i18n",
    `${DJANGO_I18N_FILTERS_URL}#std-templatefilter-language_bidi`,
  ),
  libraryFilter(
    "language_name_translated",
    "Returns the language name translated into the active language.",
    "i18n",
    `${DJANGO_I18N_FILTERS_URL}#std-templatefilter-language_name_translated`,
  ),
  libraryFilter(
    "localize",
    "Forces localization of a single value.",
    "l10n",
    `${DJANGO_L10N_FILTERS_URL}#std-templatefilter-localize`,
  ),
  libraryFilter(
    "unlocalize",
    "Forces a single value to render without localization.",
    "l10n",
    `${DJANGO_L10N_FILTERS_URL}#std-templatefilter-unlocalize`,
  ),
  libraryFilter(
    "localtime",
    "Converts a datetime to the current time zone.",
    "tz",
    `${DJANGO_TIMEZONE_FILTERS_URL}#std-templatefilter-localtime`,
  ),
  libraryFilter(
    "utc",
    "Converts a datetime to UTC.",
    "tz",
    `${DJANGO_TIMEZONE_FILTERS_URL}#std-templatefilter-utc`,
  ),
  libraryFilter(
    "timezone",
    "Converts a datetime to the supplied time zone.",
    "tz",
    `${DJANGO_TIMEZONE_FILTERS_URL}#std-templatefilter-timezone`,
  ),
  libraryFilter(
    "apnumber",
    "Spells out the numbers one through nine and leaves larger numbers as digits.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-apnumber`,
  ),
  libraryFilter(
    "intcomma",
    "Formats an integer or float with thousands separators.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-intcomma`,
  ),
  libraryFilter(
    "intword",
    "Formats a large integer using a readable magnitude such as million or billion.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-intword`,
  ),
  libraryFilter(
    "naturalday",
    "Formats a date as today, tomorrow, yesterday, or a formatted date.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-naturalday`,
  ),
  libraryFilter(
    "naturaltime",
    "Formats a datetime as a natural-language distance from the current time.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-naturaltime`,
  ),
  libraryFilter(
    "ordinal",
    "Formats an integer as an ordinal such as `1st` or `2nd`.",
    "humanize",
    `${DJANGO_HUMANIZE_FILTERS_URL}#std-templatefilter-ordinal`,
  ),
  libraryFilter(
    "tree_info",
    "Pairs each item in a tree-ordered list with metadata describing opened and closed tree levels.",
    "mptt_tags",
    `${MPTT_FILTERS_URL}#tree-info-filter`,
  ),
  libraryFilter(
    "tree_path",
    "Joins tree path items with a configurable separator.",
    "mptt_tags",
    `${MPTT_FILTERS_URL}#tree-path`,
  ),
  libraryFilter(
    "crispy",
    "Renders a form or formset using django-crispy-forms.",
    "crispy_forms_tags",
    `${CRISPY_FORMS_FILTERS_URL}#templatetags.crispy_forms_filters.as_crispy_form`,
  ),
  libraryFilter(
    "as_crispy_errors",
    "Renders only a form's errors using django-crispy-forms.",
    "crispy_forms_tags",
    `${CRISPY_FORMS_FILTERS_URL}#templatetags.crispy_forms_filters.as_crispy_errors`,
  ),
  libraryFilter(
    "as_crispy_field",
    "Renders a bound form field using django-crispy-forms.",
    "crispy_forms_tags",
    `${CRISPY_FORMS_FILTERS_URL}#templatetags.crispy_forms_filters.as_crispy_field`,
  ),
  libraryFilter(
    "flatatt",
    "Converts an attribute mapping into escaped HTML attributes.",
    "crispy_forms_tags",
    `${CRISPY_FORMS_FILTERS_URL}#templatetags.crispy_forms_filters.flatatt_filter`,
  ),
  libraryFilter(
    "optgroups",
    "Returns grouped choice metadata for rendering a form field's option groups.",
    "crispy_forms_tags",
    `${CRISPY_FORMS_FILTERS_URL}#templatetags.crispy_forms_filters.optgroups`,
  ),
  libraryFilter(
    "resolution",
    "Returns an alternative-resolution version of a sorl-thumbnail image.",
    "thumbnail",
    `${SORL_THUMBNAIL_FILTERS_URL}#resolution`,
  ),
  libraryFilter(
    "is_portrait",
    "Returns whether a sorl-thumbnail image is taller than it is wide.",
    "thumbnail",
    `${SORL_THUMBNAIL_FILTERS_URL}#is-portrait`,
  ),
  libraryFilter(
    "margin",
    "Calculates margins for centering a sorl-thumbnail image inside a padding box.",
    "thumbnail",
    `${SORL_THUMBNAIL_FILTERS_URL}#margin`,
  ),
  libraryFilter(
    "background_margin",
    "Calculates CSS background margins for centering a thumbnail inside a target geometry.",
    "thumbnail",
    SORL_THUMBNAIL_LEGACY_FILTERS_URL,
  ),
  libraryFilter(
    "markdown_thumbnails",
    "Rewrites image references in Markdown text to use generated thumbnails.",
    "thumbnail",
    SORL_THUMBNAIL_LEGACY_FILTERS_URL,
  ),
  libraryFilter(
    "html_thumbnails",
    "Rewrites HTML image sources to use generated thumbnails.",
    "thumbnail",
    SORL_THUMBNAIL_LEGACY_FILTERS_URL,
  ),
];

export const djangoFilterDocs: DjangoFilterDoc[] = djangoFilterDocsWithoutExamples.map((doc) => ({
  ...doc,
  examples: FILTER_EXAMPLES[doc.name],
}));

export const djangoFilterDocsByName = new Map(
  djangoFilterDocs.map((doc) => [doc.name, doc] as const),
);
