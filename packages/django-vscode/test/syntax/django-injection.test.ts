import * as assert from "assert";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vite-plus/test";
import type { IGrammar, StateStack } from "vscode-textmate";
import { parseRawGrammar, Registry } from "vscode-textmate";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";

const require = createRequire(import.meta.url);
const testDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(testDir, "..", "..");
const grammarPath = join(packageRoot, "syntaxes", "django-injection.tmLanguage.json");
const packageJsonPath = join(packageRoot, "package.json");

type Token = {
  text: string;
  scopes: string[];
};

let grammarPromise: Promise<IGrammar> | undefined;
let htmlGrammarPromise: Promise<IGrammar> | undefined;
let onigurumaWasmPromise: Promise<void> | undefined;

function asArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

async function loadOnigurumaWasm(): Promise<void> {
  if (!onigurumaWasmPromise) {
    const wasmPath = require.resolve("vscode-oniguruma/release/onig.wasm");
    onigurumaWasmPromise = loadWASM(asArrayBuffer(readFileSync(wasmPath)));
  }

  return onigurumaWasmPromise;
}

async function loadDjangoGrammar(): Promise<IGrammar> {
  if (!grammarPromise) {
    grammarPromise = (async () => {
      await loadOnigurumaWasm();

      const registry = new Registry({
        onigLib: Promise.resolve({
          createOnigScanner(patterns: string[]) {
            return new OnigScanner(patterns);
          },
          createOnigString(value: string) {
            return new OnigString(value);
          },
        }),
        loadGrammar: async (scopeName) => {
          if (scopeName === "source.django.injection") {
            return parseRawGrammar(readFileSync(grammarPath, "utf8"), grammarPath);
          }

          if (scopeName === "text.html.basic") {
            return parseRawGrammar(
              JSON.stringify({
                scopeName: "text.html.basic",
                patterns: [
                  { match: "</?[A-Za-z][^>]*>", name: "meta.tag.html" },
                  { match: "[^<{]+", name: "text.html.basic" },
                  { match: ".", name: "text.html.basic" },
                ],
              }),
              "html.tmLanguage.json",
            );
          }

          return null;
        },
      });

      const grammar = await registry.loadGrammar("source.django.injection");
      assert.ok(grammar, "Expected to load the Django injection grammar");
      return grammar;
    })();
  }

  return grammarPromise;
}

async function loadHtmlGrammar(): Promise<IGrammar> {
  if (!htmlGrammarPromise) {
    htmlGrammarPromise = (async () => {
      await loadOnigurumaWasm();

      const registry = new Registry({
        onigLib: Promise.resolve({
          createOnigScanner(patterns: string[]) {
            return new OnigScanner(patterns);
          },
          createOnigString(value: string) {
            return new OnigString(value);
          },
        }),
        loadGrammar: async (scopeName) => {
          if (scopeName === "source.django.injection") {
            return parseRawGrammar(readFileSync(grammarPath, "utf8"), grammarPath);
          }

          if (scopeName === "text.html.basic") {
            return parseRawGrammar(
              JSON.stringify({
                scopeName: "text.html.basic",
                patterns: [
                  { begin: "<!--", end: "-->", name: "comment.block.html" },
                  {
                    begin: "(<)([A-Za-z][A-Za-z0-9-]*)",
                    end: "(>)",
                    name: "meta.tag.html",
                    patterns: [
                      {
                        begin: '\\b(href|src)\\s*(=)\\s*(")',
                        end: '(")',
                        name: "meta.attribute.link.html markup.underline.link.html string.quoted.double.html",
                        beginCaptures: {
                          "1": { name: "entity.other.attribute-name.html" },
                          "2": { name: "punctuation.separator.key-value.html" },
                          "3": { name: "punctuation.definition.string.begin.html" },
                        },
                        endCaptures: {
                          "1": { name: "punctuation.definition.string.end.html" },
                        },
                      },
                      {
                        begin: '\\b([A-Za-z_:][A-Za-z0-9_:.-]*)\\s*(=)\\s*(")',
                        end: '(")',
                        name: "meta.attribute.html string.quoted.double.html",
                        beginCaptures: {
                          "1": { name: "entity.other.attribute-name.html" },
                          "2": { name: "punctuation.separator.key-value.html" },
                          "3": { name: "punctuation.definition.string.begin.html" },
                        },
                        endCaptures: {
                          "1": { name: "punctuation.definition.string.end.html" },
                        },
                      },
                      { begin: '"', end: '"', name: "string.quoted.double.html" },
                      { match: "\\s+", name: "meta.tag.html" },
                      { match: "[^\\s>]+", name: "meta.tag.html" },
                    ],
                  },
                  { match: "[^<{]+", name: "text.html.basic" },
                  { match: ".", name: "text.html.basic" },
                ],
              }),
              "html.tmLanguage.json",
            );
          }

          return null;
        },
        getInjections: (scopeName) => {
          if (scopeName === "text.html.basic") {
            return ["source.django.injection"];
          }

          return [];
        },
      });

      const grammar = await registry.loadGrammar("text.html.basic");
      assert.ok(grammar, "Expected to load the test HTML grammar");
      return grammar;
    })();
  }

  return htmlGrammarPromise;
}

async function tokenize(source: string): Promise<Token[]> {
  return tokenizeWithGrammar(await loadDjangoGrammar(), source);
}

async function tokenizeHtml(source: string): Promise<Token[]> {
  return tokenizeWithGrammar(await loadHtmlGrammar(), source);
}

function tokenizeWithGrammar(grammar: IGrammar, source: string): Token[] {
  const tokens: Token[] = [];
  let ruleStack: StateStack | null = null;

  for (const line of source.split(/\r?\n/)) {
    const result = grammar.tokenizeLine(line, ruleStack);

    for (let index = 0; index < result.tokens.length; index++) {
      const token = result.tokens[index];
      const nextToken = result.tokens[index + 1];
      tokens.push({
        text: line.slice(token.startIndex, nextToken?.startIndex ?? line.length),
        scopes: token.scopes,
      });
    }

    ruleStack = result.ruleStack;
  }

  return tokens;
}

function tokenContaining(tokens: Token[], text: string): Token {
  const token = tokens.find((candidate) => candidate.text.includes(text));
  assert.ok(token, `Expected a token containing ${JSON.stringify(text)} in ${dumpTokens(tokens)}`);
  return token;
}

function tokenWithText(tokens: Token[], text: string): Token {
  const token = tokens.find((candidate) => candidate.text === text);
  assert.ok(token, `Expected a token equal to ${JSON.stringify(text)} in ${dumpTokens(tokens)}`);
  return token;
}

function tokensWithText(tokens: Token[], text: string): Token[] {
  const matchingTokens = tokens.filter((candidate) => candidate.text === text);
  assert.ok(
    matchingTokens.length > 0,
    `Expected tokens equal to ${JSON.stringify(text)} in ${dumpTokens(tokens)}`,
  );
  return matchingTokens;
}

function assertHasScope(token: Token, scope: string): void {
  assert.ok(
    token.scopes.includes(scope),
    `Expected ${JSON.stringify(token.text)} to include ${scope}; scopes were ${token.scopes.join(" ")}`,
  );
}

function assertNoScopeContaining(token: Token, scopePart: string): void {
  assert.ok(
    !token.scopes.some((scope) => scope.includes(scopePart)),
    `Expected ${JSON.stringify(token.text)} not to include ${scopePart}; scopes were ${token.scopes.join(" ")}`,
  );
}

function dumpTokens(tokens: Token[]): string {
  return tokens
    .map((token) => `${JSON.stringify(token.text)} [${token.scopes.join(" ")}]`)
    .join("\n");
}

describe("Django injection TextMate grammar", () => {
  it("scopes {% comment %} blocks as comments instead of highlighting their contents", async () => {
    const tokens = await tokenize("{% comment %}<div>{{ value }}</div>{% endcomment %}");
    const openingDelimiter = tokenWithText(tokens, "{%");
    const openingCommentTag = tokenWithText(tokens, "comment");
    const closingCommentTag = tokenWithText(tokens, "endcomment");
    const commentedValue = tokenContaining(tokens, "value");

    assertHasScope(openingDelimiter, "comment.block.django.multiline");
    assertNoScopeContaining(openingDelimiter, "punctuation.definition.tag");
    assertHasScope(openingCommentTag, "comment.block.django.multiline");
    assertNoScopeContaining(openingCommentTag, "keyword.control.comment.django");
    assertHasScope(closingCommentTag, "comment.block.django.multiline");
    assertNoScopeContaining(closingCommentTag, "keyword.control.comment.django");
    assertHasScope(commentedValue, "comment.block.django.multiline");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");
    assertNoScopeContaining(commentedValue, "variable.other.django");
  });

  it("supports optional comment notes and compact tag spacing", async () => {
    const tokens = await tokenize(
      '{%comment "note"%}<span>{% if enabled %}{{ value }}{% endif %}</span>{%endcomment%}',
    );
    const commentedIfTag = tokenContaining(tokens, "if enabled");
    const commentedValue = tokenContaining(tokens, "value");

    assertHasScope(commentedIfTag, "comment.block.django.multiline");
    assertHasScope(commentedValue, "comment.block.django.multiline");
    assertNoScopeContaining(commentedIfTag, "keyword.control.flow.django");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");
  });

  it("supports comment block whitespace trim markers", async () => {
    const tokens = await tokenize("{%- comment -%}<b>{{ value }}</b>{%- endcomment -%}");
    const commentedValue = tokenContaining(tokens, "value");

    assertHasScope(commentedValue, "comment.block.django.multiline");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");
  });

  it("keeps single-line {# #} comments from highlighting nested template syntax", async () => {
    const tokens = await tokenize("{# hidden {{ value }} and {% if enabled %} #}");
    const commentedValue = tokenContaining(tokens, "value");

    assertHasScope(commentedValue, "comment.line.number-sign.django");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");
    assertNoScopeContaining(commentedValue, "keyword.control.flow.django");
  });

  it("works when injected into an HTML grammar", async () => {
    const normalTokens = await tokenizeHtml("<p>{{ value }}</p>");
    const commentTokens = await tokenizeHtml(
      "{% comment %}<div>{{ commented_value }}</div>{% endcomment %}",
    );
    const verbatimTokens = await tokenizeHtml(
      "{% verbatim %}<div>{{ verbatim_value }}</div>{% endverbatim %}",
    );

    assertHasScope(tokenWithText(normalTokens, "value"), "variable.other.django");

    const commentedValue = tokenContaining(commentTokens, "commented_value");
    assertHasScope(commentedValue, "comment.block.django.multiline");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");

    const verbatimValue = tokenContaining(verbatimTokens, "verbatim_value");
    assertHasScope(verbatimValue, "meta.embedded.verbatim.django");
    assertNoScopeContaining(verbatimValue, "meta.tag.template.variable.django");
  });

  it("does not inject Django highlighting into HTML comments", async () => {
    const tokens = await tokenizeHtml("<!-- hidden {{ value }} and {% if enabled %} -->");
    const commentedValue = tokenContaining(tokens, "value");

    assertHasScope(commentedValue, "comment.block.html");
    assertNoScopeContaining(commentedValue, "meta.tag.template.variable.django");
    assertNoScopeContaining(commentedValue, "keyword.control.flow.django");
  });

  it("marks Django syntax in link attributes as embedded so link styling is reset", async () => {
    const tokens = await tokenizeHtml(
      '<a href="{{ create_task_url }}">New task</a><img src="{% static \'img/dashboard-footer.svg\' %}" alt="" />',
    );
    const urlVariable = tokenWithText(tokens, "create_task_url");
    const staticTag = tokenWithText(tokens, "static");

    assertNoScopeContaining(urlVariable, "markup.underline.link");
    assertHasScope(urlVariable, "meta.embedded.django");
    assertHasScope(urlVariable, "meta.tag.template.variable.django");
    assertNoScopeContaining(staticTag, "markup.underline.link");
    assertHasScope(staticTag, "meta.embedded.django");
    assertHasScope(staticTag, "meta.tag.template.block.django");
  });

  it("does not scope plain HTML link attribute values as underlined links", async () => {
    const tokens = await tokenizeHtml(
      '<a href="/tasks/">Tasks</a><img src="/static/img/logo.svg" alt="" />',
    );
    const hrefValue = tokenWithText(tokens, "/tasks/");
    const srcValue = tokenWithText(tokens, "/static/img/logo.svg");

    assertNoScopeContaining(hrefValue, "markup.underline.link");
    assertHasScope(hrefValue, "string.quoted.double.html");
    assertNoScopeContaining(srcValue, "markup.underline.link");
    assertHasScope(srcValue, "string.quoted.double.html");
  });

  it("does not highlight Django syntax inside verbatim blocks", async () => {
    const tokens = await tokenize(
      "{% verbatim js_template %}<script>{{ not_django }}</script>{% endverbatim js_template %}",
    );
    const verbatimValue = tokenContaining(tokens, "not_django");

    assertHasScope(verbatimValue, "meta.embedded.verbatim.django");
    assertNoScopeContaining(verbatimValue, "meta.tag.template.variable.django");
    assertNoScopeContaining(verbatimValue, "variable.other.django");
  });

  it("scopes dotted variable chains like TypeScript object/property access", async () => {
    const tokens = await tokenize("{% if form.email.errors %}");

    assertHasScope(tokenWithText(tokens, "form"), "variable.other.object.django");
    assertHasScope(tokenWithText(tokens, "email"), "variable.other.object.property.django");
    assertHasScope(tokenWithText(tokens, "errors"), "variable.other.property.django");
    assertHasScope(tokenWithText(tokens, "."), "punctuation.accessor.django");
  });

  it("keeps dotted variable chain scopes when injected into HTML strings", async () => {
    const tokens = await tokenizeHtml(
      '<div class="{% if form.email.errors %}invalid{% endif %}"></div>',
    );

    assertHasScope(tokenWithText(tokens, "form"), "variable.other.object.django");
    assertHasScope(tokenWithText(tokens, "email"), "variable.other.object.property.django");
    assertHasScope(tokenWithText(tokens, "errors"), "variable.other.property.django");
    assertNoScopeContaining(tokenWithText(tokens, "form"), "entity.other.attribute-name.html");
    assertNoScopeContaining(tokenWithText(tokens, "email"), "entity.other.attribute-name.html");
    assertNoScopeContaining(tokenWithText(tokens, "errors"), "entity.other.attribute-name.html");
  });

  it("continues to highlight ordinary tags, variables, filters, and operators", async () => {
    const tokens = await tokenize(
      "{% if user and user.is_staff %}{{ user.username|default:'anon' }}{% endif %}",
    );

    assertHasScope(tokenWithText(tokens, "if"), "keyword.control.flow.django");
    assertHasScope(tokenWithText(tokens, "and"), "keyword.operator.logical.django");
    assertHasScope(tokenWithText(tokens, "is_staff"), "variable.other.property.django");
    assertHasScope(tokenWithText(tokens, "username"), "variable.other.property.django");
    assertHasScope(tokenWithText(tokens, "default"), "support.function.filter.django");
  });

  it("only highlights template tag names at the start of tag blocks", async () => {
    const loadTokens = await tokenize("{% load static i18n tz cache thumbnail compress %}");

    assertHasScope(tokenWithText(loadTokens, "load"), "keyword.control.block.django");
    for (const libraryName of ["static", "i18n", "tz", "cache", "thumbnail", "compress"]) {
      const token = tokenWithText(loadTokens, libraryName);

      assertHasScope(token, "variable.other.django");
      assertNoScopeContaining(token, "keyword.control.");
    }

    const ifTokens = await tokenize("{% if if.is_authenticated %}");
    const ifOccurrences = tokensWithText(ifTokens, "if");

    assert.strictEqual(
      ifOccurrences.length,
      2,
      `Expected two if tokens in ${dumpTokens(ifTokens)}`,
    );
    assertHasScope(ifOccurrences[0], "keyword.control.flow.django");
    assertHasScope(ifOccurrences[1], "variable.other.object.django");
    assertNoScopeContaining(ifOccurrences[1], "keyword.control.");
  });

  it("colors Django template delimiters like HTML attribute names", async () => {
    const tokens = await tokenize("{% if user %}{{ user.username }}{% endif %}");

    assertHasScope(tokenWithText(tokens, "{%"), "entity.other.attribute-name.html");
    assertHasScope(tokenWithText(tokens, "%}"), "entity.other.attribute-name.html");
    assertHasScope(tokenWithText(tokens, "{{"), "entity.other.attribute-name.html");
    assertHasScope(tokenWithText(tokens, "}}"), "entity.other.attribute-name.html");
  });

  it("scopes in inside for tags as control flow", async () => {
    const forTokens = await tokenize("{% for user in users %}{% endfor %}");
    const ifTokens = await tokenize("{% if user in staff %}{% endif %}");

    assertHasScope(tokenWithText(forTokens, "in"), "keyword.control.flow.django");
    assertNoScopeContaining(tokenWithText(forTokens, "in"), "keyword.operator.logical.django");
    assertHasScope(tokenWithText(ifTokens, "in"), "keyword.operator.logical.django");
  });

  it("highlights supported modern Django built-in tags", async () => {
    const tokens = await tokenize(
      '{% translate "Hi" %}{% blocktranslate count counter=list|length %}{{ counter }}{% plural %}{{ counter }}{% endblocktranslate %}{% querystring page=2 %}{% lorem 2 p %}',
    );

    assertHasScope(tokenWithText(tokens, "translate"), "keyword.control.i18n.django");
    assertHasScope(tokenWithText(tokens, "blocktranslate"), "keyword.control.i18n.django");
    assertHasScope(tokenWithText(tokens, "plural"), "keyword.control.i18n.django");
    assertHasScope(tokenWithText(tokens, "endblocktranslate"), "keyword.control.i18n.django");
    assertHasScope(tokenWithText(tokens, "querystring"), "keyword.control.url.django");
    assertHasScope(tokenWithText(tokens, "lorem"), "keyword.control.debug.django");
  });

  it("highlights unknown custom tag names with a fallback scope", async () => {
    const tokens = await tokenize("{% nonexistenttag fallback_arg %}");

    assertHasScope(tokenWithText(tokens, "nonexistenttag"), "keyword.control.tag.django");
    assertHasScope(tokenWithText(tokens, "fallback_arg"), "variable.other.django");
  });

  it("highlights all template tags from the formatter tag list", async () => {
    const startTags = [
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
      "ifequal",
      "ifnotequal",
      "blocktrans",
      "thumbnail",
      "component",
      "component_block",
      "fill",
      "slot",
      "provide",
      "compress",
      "addtoblock",
      "with_data",
      "flag",
      "switch",
      "sample",
      "recursetree",
      "placeholder",
      "static_placeholder",
      "render_model_block",
      "render_model_add_block",
      "render_plugin_block",
      "element",
      "crispy_addon",
    ];
    const standaloneTags = [
      "elif",
      "else",
      "empty",
      "plural",
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
      "trans",
      "html_attrs",
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
      "wafflejs",
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
      "drilldown_tree_for_node",
      "full_tree_for_model",
      "component_css_dependencies",
      "component_js_dependencies",
      "cms_toolbar",
      "render_block",
      "add_data",
      "crispy",
      "crispy_field",
    ];
    const supportedTags = new Set([
      ...startTags,
      ...standaloneTags,
      ...startTags.map((tag) => `end${tag}`),
    ]);

    for (const tag of supportedTags) {
      const tokens = await tokenize(`{% ${tag} value %}`);
      const tagToken = tokenWithText(tokens, tag);

      assert.ok(
        tagToken.scopes.some(
          (scope) =>
            scope.startsWith("keyword.control.") || scope.startsWith("comment.block.django"),
        ),
        `Expected ${tag} to be highlighted as a supported tag; scopes were ${tagToken.scopes.join(" ")}`,
      );
      assertNoScopeContaining(tagToken, "variable.other.django");
    }
  });

  it("keeps the contributed grammar attached to HTML TextMate scopes", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const grammarContribution = packageJson.contributes.grammars.find(
      (grammar: { scopeName?: string }) => grammar.scopeName === "source.django.injection",
    );

    assert.ok(grammarContribution, "Expected a source.django.injection grammar contribution");
    assert.deepStrictEqual(grammarContribution.injectTo, [
      "text.html",
      "text.html.basic",
      "text.html.derivative",
    ]);
  });
});
