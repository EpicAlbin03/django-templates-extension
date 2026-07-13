import { CompletionItemKind, MarkupKind, type CompletionItem } from "vscode-languageserver-types";
import { djangoTagDocsByName, type DjangoTagDoc } from "./djangoTags.js";
import { renderTagCompletionDocumentation } from "./renderTagDocumentation.js";

export interface DjangoFilterDoc {
  name: string;
  description: string;
}

export const djangoFilterDocs: DjangoFilterDoc[] = [
  { name: "join", description: "Filter |join:', '" },
  { name: "addslashes", description: "Filter |addslashes" },
  { name: "capfirst", description: "Filter |capfirst" },
  { name: "escapejs", description: "Filter |escapejs" },
  { name: "floatformat", description: "Filter |floatformat" },
  { name: "iriencode", description: "Filter |iriencode" },
  { name: "linenumbers", description: "Filter |linenumbers" },
  { name: "lower", description: "Filter |lower" },
  { name: "make_list", description: "Filter |make_list" },
  { name: "slugify", description: "Filter |slugify" },
  { name: "stringformat", description: "Filter |stringformat" },
  { name: "title", description: "Filter |title" },
  { name: "truncatechars", description: "Filter |truncatechars" },
  { name: "truncatechars_html", description: "Filter |stuff:', truncatechars_html" },
  { name: "truncatewords", description: "Filter |truncatewords" },
  { name: "truncatewords_html", description: "Filter |stuff:', truncatewords_html" },
  { name: "upper", description: "Filter |upper" },
  { name: "urlencode", description: "Filter |urlencode" },
  { name: "urlize", description: "Filter |urlize" },
  { name: "urlizetrunc", description: "Filter |urlizetrunc" },
  { name: "wordcount", description: "Filter |wordcount" },
  { name: "wordwrap", description: "Filter |wordwrap" },
  { name: "ljust", description: "Filter |ljust" },
  { name: "rjust", description: "Filter |rjust" },
  { name: "center", description: "Filter |center" },
  { name: "cut", description: "Filter |cut" },
  { name: "escape", description: "Filter |escape" },
  { name: "force_escape", description: "Filter |force_escape" },
  { name: "linebreaks", description: "Filter |linebreaks" },
  { name: "linebreaksbr", description: "Filter |linebreaksbr" },
  { name: "safe", description: "Filter |safe" },
  { name: "safeseq", description: "Filter |safeseq" },
  { name: "striptags", description: "Filter |striptags" },
  { name: "dictsort", description: "Filter |dictsort" },
  { name: "dictsortreversed", description: "Filter |stuff:dictsortreversed" },
  { name: "first", description: "Filter |first" },
  { name: "last", description: "Filter |last" },
  { name: "length", description: "Filter |length" },
  { name: "length_is", description: "Filter |length_is" },
  { name: "random", description: "Filter |random" },
  { name: "slice", description: "Filter |slice" },
  { name: "unordered_list", description: "Filter |unordered_list" },
  { name: "add", description: "Filter |add" },
  { name: "get_digit", description: "Filter |get_digit" },
  { name: "date", description: "Filter |date" },
  { name: "time", description: "Filter |time" },
  { name: "timesince", description: "Filter |timesince" },
  { name: "timeuntil", description: "Filter |timeuntil" },
  { name: "default", description: "Filter |default" },
  { name: "default_if_none", description: "Filter |stuff:default_if_none" },
  { name: "divisibleby", description: "Filter |divisibleby" },
  { name: "yesno", description: "Filter |yesno" },
  { name: "filesizeformat", description: "Filter |filesizeformat" },
  { name: "pluralize", description: "Filter |pluralize" },
  { name: "phone2numeric", description: "Filter |phone2numeric" },
  { name: "pprint", description: "Filter |pprint" },
  { name: "escapeseq", description: "Filter |escapeseq" },
  { name: "json_script", description: "Filter |json_script" },
  { name: "language_name", description: "Filter |language_name" },
  { name: "language_name_local", description: "Filter |language_name_local" },
  { name: "language_bidi", description: "Filter |language_bidi" },
  { name: "language_name_translated", description: "Filter |language_name_translated" },
  { name: "localize", description: "Filter |localize" },
  { name: "unlocalize", description: "Filter |unlocalize" },
  { name: "localtime", description: "Filter |localtime" },
  { name: "utc", description: "Filter |utc" },
  { name: "timezone", description: "Filter |timezone" },
  { name: "apnumber", description: "Filter |apnumber" },
  { name: "intcomma", description: "Filter |intcomma" },
  { name: "intword", description: "Filter |intword" },
  { name: "naturalday", description: "Filter |naturalday" },
  { name: "naturaltime", description: "Filter |naturaltime" },
  { name: "ordinal", description: "Filter |ordinal" },
  { name: "tree_info", description: "Filter |tree_info" },
  { name: "tree_path", description: "Filter |tree_path" },
  { name: "crispy", description: "Filter |crispy" },
  { name: "as_crispy_errors", description: "Filter |as_crispy_errors" },
  { name: "as_crispy_field", description: "Filter |as_crispy_field" },
  { name: "flatatt", description: "Filter |flatatt" },
  { name: "optgroups", description: "Filter |optgroups" },
  { name: "resolution", description: "Filter |resolution" },
  { name: "is_portrait", description: "Filter |is_portrait" },
  { name: "margin", description: "Filter |margin" },
  { name: "background_margin", description: "Filter |background_margin" },
  { name: "markdown_thumbnails", description: "Filter |markdown_thumbnails" },
  { name: "html_thumbnails", description: "Filter |html_thumbnails" },
];

export const djangoTagCompletionItems: CompletionItem[] = Array.from(
  djangoTagDocsByName.values(),
  createTagCompletionItem,
);

export const djangoFilterCompletionItems: CompletionItem[] = djangoFilterDocs.map(
  createFilterCompletionItem,
);

function createTagCompletionItem(doc: DjangoTagDoc): CompletionItem {
  return {
    label: doc.name,
    kind: CompletionItemKind.Keyword,
    detail: `{% ${doc.name} %}`,
    documentation: {
      kind: MarkupKind.Markdown,
      value: renderTagCompletionDocumentation(doc),
    },
  };
}

function createFilterCompletionItem(doc: DjangoFilterDoc): CompletionItem {
  return {
    label: doc.name,
    kind: CompletionItemKind.Function,
    detail: `|${doc.name}`,
    documentation: {
      kind: MarkupKind.Markdown,
      value: `\`${doc.description}\``,
    },
  };
}
