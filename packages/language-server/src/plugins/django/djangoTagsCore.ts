import type { DjangoTagDoc } from "./djangoTagTypes.js";

// Django references
const builtinsReference = "https://docs.djangoproject.com/en/6.0/ref/templates/builtins/";
const cspNonceAttrReference =
  "https://docs.djangoproject.com/en/6.1/ref/templates/builtins/#std-templatetag-csp_nonce_attr";

export const djangoCoreTagDocs: DjangoTagDoc[] = [
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
];

export const djangoAdditionalCoreTagDocs: DjangoTagDoc[] = [
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
];
