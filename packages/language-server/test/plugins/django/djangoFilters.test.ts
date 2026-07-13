import * as assert from "assert";
import { readFileSync } from "node:fs";
import { MarkupKind } from "vscode-languageserver-types";
import { describe, it } from "vite-plus/test";
import { djangoFilterCompletionItems } from "../../../src/plugins/django/djangoCompletions.js";
import {
  djangoFilterDocs,
  djangoFilterDocsByName,
} from "../../../src/plugins/django/djangoFilters.js";
import {
  renderFilterDocumentation,
  renderFilterHoverDocumentation,
} from "../../../src/plugins/django/renderFilterDocumentation.js";

describe("Django filter documentation", () => {
  it("provides a description and documentation link for every supported filter", () => {
    assert.strictEqual(djangoFilterDocsByName.size, djangoFilterDocs.length);

    for (const doc of djangoFilterDocs) {
      assert.strictEqual(djangoFilterDocsByName.get(doc.name), doc);
      assert.ok(doc.description.trim(), `${doc.name} has no description`);
      assert.ok(!doc.description.startsWith("Filter |"), `${doc.name} still uses placeholder text`);
      assert.ok(!doc.description.includes(";"), `${doc.name} description contains a semicolon`);
      assert.doesNotThrow(() => new URL(doc.reference), `${doc.name} has an invalid reference`);
    }
  });

  it("renders the filter signature, description, load instruction, and reference", () => {
    const intcomma = djangoFilterDocsByName.get("intcomma")!;

    assert.strictEqual(
      renderFilterDocumentation(intcomma),
      "`|intcomma`\n\nFormats an integer or float with thousands separators.\n\n**Load:** `{% load humanize %}`\n\n[Documentation](https://docs.djangoproject.com/en/6.0/ref/contrib/humanize/#std-templatefilter-intcomma)",
    );
  });

  it("renders usage examples in hover documentation for non-obvious filters", () => {
    const defaultDoc = djangoFilterDocsByName.get("default")!;
    const hover = renderFilterHoverDocumentation(defaultDoc);

    assert.match(hover, /#### Usage/);
    assert.match(hover, /```html\n\{\{ value\|default:"Nothing to display" \}\}\n```/);
    assert.ok(!renderFilterDocumentation(defaultDoc).includes("#### Usage"));

    for (const doc of djangoFilterDocs) {
      assert.ok(
        doc.examples === undefined || doc.examples.every((example) => example.trim()),
        `${doc.name} has an empty example`,
      );
    }
  });

  it("marks filters removed from current Django versions", () => {
    const lengthIs = renderFilterDocumentation(djangoFilterDocsByName.get("length_is")!);

    assert.match(lengthIs, /\*\*Deprecated:\*\* Removed in Django 4\.0/);
    assert.match(lengthIs, /docs\.djangoproject\.com\/en\/3\.2/);
  });

  it("keeps sorl-thumbnail references on the official documentation host", () => {
    for (const filterName of ["background_margin", "markdown_thumbnails", "html_thumbnails"]) {
      const reference = djangoFilterDocsByName.get(filterName)!.reference;
      assert.match(reference, /^https:\/\/sorl-thumbnail\.readthedocs\.io\//);
    }
  });

  it("keeps every supported filter in the manual hover fixture", () => {
    const fixtureUrl = new URL("../../../../../test-filters.html", import.meta.url);
    const fixture = readFileSync(fixtureUrl, "utf8");

    for (const doc of djangoFilterDocs) {
      assert.match(fixture, new RegExp(`\\|\\s*${doc.name}\\b`), `${doc.name} is missing`);
      if (doc.load) {
        assert.match(
          fixture,
          new RegExp(`{%\\s*load[^%}]*\\b${doc.load}\\b[^%}]*%}`),
          `${doc.load} is not loaded`,
        );
      }
    }
  });

  it("uses the same rich documentation for filter completions", () => {
    const lower = djangoFilterCompletionItems.find((item) => item.label === "lower")!;
    const documentation = lower.documentation as { kind: string; value: string };

    assert.strictEqual(documentation.kind, MarkupKind.Markdown);
    assert.strictEqual(
      documentation.value,
      renderFilterDocumentation(djangoFilterDocsByName.get("lower")!),
    );
  });
});
