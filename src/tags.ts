// Supported template block tags from Django built-ins plus supported custom tags.
const START_TAGS = new Set([
  // django
  "if",
  "for",
  "block",
  "filter",
  "with",
  "autoescape",
  "ifchanged",
  "spaceless",
  "blocktranslate",
  "cache",
  "localize",
  "localtime",
  "timezone",
  "language",
  "verbatim",
  "comment",
  "partialdef",

  // deprecated
  "ifequal",
  "ifnotequal",
  "blocktrans",

  // sorl-thumbnail
  "thumbnail",

  // django-components
  "component",
  "component_block",
  "fill",
  "slot",
  "provide",

  // django-compressor
  "compress",

  // django-sekizai
  "addtoblock",
  "with_data",

  // django-waffle
  "flag",
  "switch",
  "sample",

  // django-mptt
  "recursetree",

  // django CMS
  "placeholder",
  "static_placeholder",
  "render_model_block",
  "render_model_add_block",
  "render_plugin_block",

  // django-allauth
  "element",

  // django-crispy-forms
  "crispy_addon",
]);

const BRANCH_TAGS = new Set([
  // django
  "elif",
  "else",
  "empty",
  "plural",
]);

const RAW_TAGS = new Set([
  // django
  "verbatim",
  "comment",
]);

const INLINE_STANDALONE_TAGS = new Set([
  // django
  "cycle",
  "firstof",
  "get_media_prefix",
  "get_static_prefix",
  "lorem",
  "now",
  "querystring",
  "csp_nonce_attr",
  "static",
  "templatetag",
  "translate",
  "url",
  "widthratio",
  "partial",

  // deprecated
  "trans",

  // django-components
  "html_attrs",

  // django CMS
  "cms_admin_url",
  "page_attribute",
  "page_url",
  "page_id_url",
  "page_language_url",
  "render_model",
  "render_model_icon",
  "render_model_add",
  "render_placeholder",
  "render_uncached_placeholder",
  "render_plugin",
  "show_placeholder",
  "static_alias",

  // django-waffle
  "wafflejs",
]);

const BLOCK_STANDALONE_TAGS = new Set([
  // django
  "csrf_token",
  "debug",
  "extends",
  "include",
  "load",
  "regroup",
  "resetcycle",
  "get_available_languages",
  "get_current_language",
  "get_current_language_bidi",
  "get_current_timezone",
  "get_language_info",
  "get_language_info_list",

  // django-mptt
  "drilldown_tree_for_node",
  "full_tree_for_model",

  // django-components
  "component_css_dependencies",
  "component_js_dependencies",

  // django CMS
  "cms_toolbar",

  // django-sekizai
  "render_block",
  "add_data",

  // django-crispy-forms
  "crispy",
  "crispy_field",
]);

export function isBranchTag(name: string): boolean {
  return BRANCH_TAGS.has(name);
}

export function isRawTag(name: string): boolean {
  return RAW_TAGS.has(name);
}

export function isEndTag(name: string): boolean {
  return name.startsWith("end");
}

export function isStartTag(name: string): boolean {
  return START_TAGS.has(name);
}

export function isInlineStandaloneTag(name: string): boolean {
  return INLINE_STANDALONE_TAGS.has(name);
}

export function isBlockStandaloneTag(name: string): boolean {
  return BLOCK_STANDALONE_TAGS.has(name);
}

export function getTagRole(name: string): "start" | "branch" | "end" | "standalone" {
  if (isBranchTag(name)) {
    return "branch";
  }

  if (isEndTag(name)) {
    return "end";
  }

  if (isStartTag(name)) {
    return "start";
  }

  return "standalone";
}
