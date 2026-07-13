import type { DjangoTagDoc } from "./djangoTagTypes.js";

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

export const djangoThirdPartyTagDocs: DjangoTagDoc[] = [
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
