import * as assert from "assert";
import {
  getLineAtPosition,
  extractStyleTag,
  extractScriptTags,
  updateRelativeImport,
  getWordAt,
  isInsideMoustacheTag,
} from "../../../src/lib/documents/utils.js";
import { Position } from "vscode-languageserver";

describe("document/utils", () => {
  describe("extractTag", () => {
    it("supports boolean attributes", () => {
      const extracted = extractStyleTag("<style test></style>");
      assert.deepStrictEqual(extracted?.attributes, { test: "test" });
    });

    it("supports unquoted attributes", () => {
      const extracted = extractStyleTag("<style type=text/css></style>");
      assert.deepStrictEqual(extracted?.attributes, {
        type: "text/css",
      });
    });

    it("does not extract style tag inside comment", () => {
      const text = `
                <p>bla</p>
                <!--<style>h1{ color: blue; }</style>-->
                <style>p{ color: blue; }</style>
            `;
      assert.deepStrictEqual(extractStyleTag(text), {
        content: "p{ color: blue; }",
        attributes: {},
        start: 108,
        end: 125,
        startPos: Position.create(3, 23),
        endPos: Position.create(3, 40),
        container: { start: 101, end: 133 },
      });
    });

    it("does not extract tags starting with style/script", () => {
      // Regression test: tags beginning with style/script should not be matched by accident
      // this would previously match <styles>....</style> due to misconfigured attribute matching regex
      const text = `
            <styles>p{ color: blue; }</styles>
            <p>bla</p>
            ></style>
            `;
      assert.deepStrictEqual(extractStyleTag(text), null);
    });

    it("is case sensitive to style/script", () => {
      const text = `
            <Style></Style>
            <Script></Script>
            `;
      assert.deepStrictEqual(extractStyleTag(text), null);
      assert.deepStrictEqual(extractScriptTags(text), null);
    });

    it("only extract attribute until tag ends", () => {
      const text = `
            <script type="typescript">
            () => abc
            </script>
            `;
      const extracted = extractScriptTags(text);
      const attributes = extracted?.script?.attributes;
      assert.deepStrictEqual(attributes, { type: "typescript" });
    });

    it("can extract with self-closing component before it", () => {
      const extracted = extractStyleTag("<SelfClosing /><style></style>");
      assert.deepStrictEqual(extracted, {
        start: 22,
        end: 22,
        startPos: {
          character: 22,
          line: 0,
        },
        endPos: {
          character: 22,
          line: 0,
        },
        attributes: {},
        content: "",
        container: {
          end: 30,
          start: 15,
        },
      });
    });

    it("can extract with unclosed element after it", () => {
      const extracted = extractStyleTag("<style></style><div><p>asd</p>");
      assert.deepStrictEqual(extracted, {
        start: 7,
        end: 7,
        startPos: {
          character: 7,
          line: 0,
        },
        endPos: {
          character: 7,
          line: 0,
        },
        attributes: {},
        content: "",
        container: {
          start: 0,
          end: 15,
        },
      });
    });

    it("extracts style tag", () => {
      const text = `
                <p>bla</p>
                <style>p{ color: blue; }</style>
            `;
      assert.deepStrictEqual(extractStyleTag(text), {
        content: "p{ color: blue; }",
        attributes: {},
        start: 51,
        end: 68,
        startPos: Position.create(2, 23),
        endPos: Position.create(2, 40),
        container: { start: 44, end: 76 },
      });
    });

    it("extracts style tag with attributes", () => {
      const text = `
                <style lang="scss">p{ color: blue; }</style>
            `;
      assert.deepStrictEqual(extractStyleTag(text), {
        content: "p{ color: blue; }",
        attributes: { lang: "scss" },
        start: 36,
        end: 53,
        startPos: Position.create(1, 35),
        endPos: Position.create(1, 52),
        container: { start: 17, end: 61 },
      });
    });

    it("extracts style tag with attributes and extra whitespace", () => {
      const text = `
                <style     lang="scss"    >  p{ color: blue; }  </style>
            `;
      assert.deepStrictEqual(extractStyleTag(text), {
        content: "  p{ color: blue; }  ",
        attributes: { lang: "scss" },
        start: 44,
        end: 65,
        startPos: Position.create(1, 43),
        endPos: Position.create(1, 64),
        container: { start: 17, end: 73 },
      });
    });

    it("extracts script tag with attribute with > in it", () => {
      const text = `
                <script lang="ts" generics="T extends Record<string, any>">content</script>
                <p>bla</p>
            `;
      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "content",
        attributes: {
          generics: "T extends Record<string, any>",
          lang: "ts",
        },
        start: 76,
        end: 83,
        startPos: Position.create(1, 75),
        endPos: Position.create(1, 82),
        container: { start: 17, end: 92 },
      });
    });

    it("extracts top level script tag only", () => {
      const text = `
                <div>
                    <script>
                        console.log('nested script')
                    </script>
                </div>
                <!-- <script>commented script</script> -->
                <script>top level script</script>
            `;

      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "top level script",
        attributes: {},
        start: 241,
        end: 257,
        startPos: Position.create(7, 24),
        endPos: Position.create(7, 40),
        container: { start: 233, end: 266 },
      });
    });

    it("extracts top level script when only whitespace follows", () => {
      const text = `
                <script>top level script</script>
                
            `;

      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "top level script",
        attributes: {},
        start: 25,
        end: 41,
        startPos: Position.create(1, 24),
        endPos: Position.create(1, 40),
        container: { start: 17, end: 50 },
      });
    });

    it("ignores script tag nested inside a regular element", () => {
      // Regression test: only top-level script tags should be extracted.
      const text = `
            <head>
                <link rel="stylesheet" href="/lib/site.css" />
                <script src="/lib/site.js"> 
                </script>
            </head>
            <p>jo</p>
            <script>top level script</script>
            <h1>Hello, world!</h1>
            <style>.bla {}</style>
            `;
      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "top level script",
        attributes: {},
        start: 216,
        end: 232,
        startPos: Position.create(7, 20),
        endPos: Position.create(7, 36),
        container: { start: 208, end: 241 },
      });
    });

    it("extracts script and module script", () => {
      const text = `
            <script context="module">a</script>
            <script>b</script>
            `;
      assert.deepStrictEqual(extractScriptTags(text), {
        moduleScript: {
          attributes: {
            context: "module",
          },
          container: {
            end: 48,
            start: 13,
          },
          content: "a",
          start: 38,
          end: 39,
          startPos: {
            character: 37,
            line: 1,
          },
          endPos: {
            character: 38,
            line: 1,
          },
        },
        script: {
          attributes: {},
          container: {
            end: 79,
            start: 61,
          },
          content: "b",
          start: 69,
          end: 70,
          startPos: {
            character: 20,
            line: 2,
          },
          endPos: {
            character: 21,
            line: 2,
          },
        },
      });
    });

    it("extract tag correctly with less-than operators in text", () => {
      const text = `
            <div>1 < 3</div>
            <script>let value = 2</script>

            <div>value < 4</div>`;
      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "let value = 2",
        attributes: {},
        start: 50,
        end: 63,
        startPos: Position.create(2, 20),
        endPos: Position.create(2, 33),
        container: { start: 42, end: 72 },
      });
    });

    it("extract tag correctly if nothing is before the tag", () => {
      const text = `<script>let value = 2</script>
                {/if}`;
      assert.deepStrictEqual(extractScriptTags(text)?.script, {
        content: "let value = 2",
        attributes: {},
        start: 8,
        end: 21,
        startPos: Position.create(0, 8),
        endPos: Position.create(0, 21),
        container: { start: 0, end: 30 },
      });
    });
  });

  describe("#getLineAtPosition", () => {
    it("should return line at position (only one line)", () => {
      assert.deepStrictEqual(getLineAtPosition(Position.create(0, 1), "ABC"), "ABC");
    });

    it("should return line at position (multiple lines)", () => {
      assert.deepStrictEqual(getLineAtPosition(Position.create(1, 1), "ABC\nDEF\nGHI"), "DEF\n");
    });
  });

  describe("#updateRelativeImport", () => {
    it("should update path of component with ending", () => {
      const newPath = updateRelativeImport(
        "C:/absolute/path/oldPath",
        "C:/absolute/newPath",
        "./Component.html",
      );
      assert.deepStrictEqual(newPath, "../path/oldPath/Component.html");
    });

    it("should update path of file without ending", () => {
      const newPath = updateRelativeImport(
        "C:/absolute/path/oldPath",
        "C:/absolute/newPath",
        "./someTsFile",
      );
      assert.deepStrictEqual(newPath, "../path/oldPath/someTsFile");
    });

    it("should update path of file going one up", () => {
      const newPath = updateRelativeImport(
        "C:/absolute/path/oldPath",
        "C:/absolute/path",
        "./someTsFile",
      );
      assert.deepStrictEqual(newPath, "./oldPath/someTsFile");
    });
  });

  describe("#getWordAt", () => {
    it("returns word between whitespaces", () => {
      assert.equal(getWordAt("qwd asd qwd", 5), "asd");
    });

    it("returns word between whitespace and end of string", () => {
      assert.equal(getWordAt("qwd asd", 5), "asd");
    });

    it("returns word between start of string and whitespace", () => {
      assert.equal(getWordAt("asd qwd", 2), "asd");
    });

    it("returns word between start of string and end of string", () => {
      assert.equal(getWordAt("asd", 2), "asd");
    });

    it("returns word with custom delimiters", () => {
      assert.equal(
        getWordAt('asd data-attr="asd" ', 10, { left: /\S+$/, right: /[\s=]/ }),
        "data-attr",
      );
    });

    it("returns empty string when only whitespace", () => {
      assert.equal(getWordAt("a  a", 2), "");
    });
  });

  describe("#isInsideMoustacheTag", () => {
    it("detects position inside expression braces", () => {
      const result = isInsideMoustacheTag("<div data-value={value}></div>", 0, 18);
      assert.strictEqual(result, true);
    });

    it("detects position after template literal", () => {
      const result = isInsideMoustacheTag("<div data-value={`a}`}></div>", 0, 19);
      assert.strictEqual(result, true);
    });

    it("detects position after nested template literals", () => {
      const result = isInsideMoustacheTag("<div data-value={`${`}`}`}></div>", 0, 23);
      assert.strictEqual(result, true);
    });
  });
});
