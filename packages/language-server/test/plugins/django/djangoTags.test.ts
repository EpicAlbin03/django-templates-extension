import * as assert from "assert";
import { readFileSync } from "node:fs";
import { describe, it } from "vite-plus/test";
import {
  djangoAdditionalCoreTagDocs,
  djangoContribTagDocs,
  djangoCoreTagDocs,
  djangoTagDocs,
  djangoTagDocsByName,
  djangoThirdPartyTagDocs,
  type DjangoTagDoc,
} from "../../../src/plugins/django/djangoTags.js";
import {
  renderTagCompletionDocumentation,
  renderTagHoverDocumentation,
} from "../../../src/plugins/django/renderTagDocumentation.js";

const TAG_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SHARED_DERIVED_NAMES = new Map([
  ["else", ["flag", "if", "ifchanged", "ifequal", "ifnotequal"]],
  ["plural", ["blocktrans", "blocktranslate"]],
]);
const SNIPPET_WITHOUT_CANONICAL_TAG_ALLOWLIST = new Set([
  "comment_inline",
  "super",
  "tag",
  "variable",
]);

type TagMemberKind = "alias" | "branch" | "end tag" | "name";
interface TagOwner {
  docName: string;
  kind: TagMemberKind;
}
interface Snippet {
  body: string | string[];
}

function getTagMembers(doc: DjangoTagDoc): Array<[string, TagMemberKind]> {
  return [
    [doc.name, "name"],
    ...(doc.aliases ?? []).map((name): [string, TagMemberKind] => [name, "alias"]),
    ...(doc.branches ?? []).map((name): [string, TagMemberKind] => [name, "branch"]),
    ...(doc.endTags ?? []).map((name): [string, TagMemberKind] => [name, "end tag"]),
  ];
}

function assertMapKeysBelongTo(
  map: Record<string, string> | undefined,
  members: string[],
  fieldName: string,
): void {
  for (const key of Object.keys(map ?? {})) {
    assert.ok(members.includes(key), `${fieldName} contains unknown tag ${key}`);
  }
}

function readTagSnippets(): Record<string, unknown> {
  const snippetUrl = new URL("../../../../django-vscode/snippets/tags.json", import.meta.url);
  return JSON.parse(readFileSync(snippetUrl, "utf8")) as Record<string, unknown>;
}

function isSnippet(value: unknown): value is Snippet {
  if (typeof value !== "object" || value === null || !("body" in value)) {
    return false;
  }

  const body = value.body;
  return (
    typeof body === "string" ||
    (Array.isArray(body) && body.every((line) => typeof line === "string"))
  );
}

function getSnippetTagNames(snippet: Snippet): string[] {
  const body = Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body;
  return Array.from(body.matchAll(/{%-?\s*([A-Za-z_][A-Za-z0-9_]*)/g), (match) => match[1]);
}

describe("Django tag catalog", () => {
  it("assembles core, contrib, and third-party data without changing catalog order", () => {
    assert.deepStrictEqual(djangoTagDocs, [
      ...djangoCoreTagDocs,
      ...djangoContribTagDocs,
      ...djangoAdditionalCoreTagDocs,
      ...djangoThirdPartyTagDocs,
    ]);
    assert.strictEqual(djangoCoreTagDocs[0].name, "autoescape");
    assert.strictEqual(djangoContribTagDocs[0].name, "static");
    assert.strictEqual(djangoAdditionalCoreTagDocs[0].name, "ifequal");
    assert.strictEqual(djangoThirdPartyTagDocs[0].name, "thumbnail");
  });

  it("requires complete, valid, and internally unique tag records", () => {
    for (const doc of djangoTagDocs) {
      assert.ok(doc.description.trim(), `${doc.name} requires a description`);
      assert.ok(doc.examples.length > 0, `${doc.name} requires an example`);
      assert.ok(
        doc.examples.every((example) => example.trim()),
        `${doc.name} has a blank example`,
      );

      const members = getTagMembers(doc);
      assert.strictEqual(
        new Set(members.map(([name]) => name)).size,
        members.length,
        `${doc.name} repeats a name, alias, branch, or end tag`,
      );
      for (const [name] of members) {
        assert.match(name, TAG_NAME_RE, `${doc.name} contains invalid tag name ${name}`);
      }

      for (const branch of doc.branches ?? []) {
        assert.ok(doc.branchDescriptions?.[branch]?.trim(), `${branch} requires a description`);
      }
      assertMapKeysBelongTo(doc.branchDescriptions, doc.branches ?? [], "branchDescriptions");
      assertMapKeysBelongTo(doc.branchReferences, doc.branches ?? [], "branchReferences");
      assertMapKeysBelongTo(doc.endTagDescriptions, doc.endTags ?? [], "endTagDescriptions");
      assertMapKeysBelongTo(doc.endTagReferences, doc.endTags ?? [], "endTagReferences");
    }
  });

  it("rejects duplicate primary, alias, branch, and end-tag ownership", () => {
    const owners = new Map<string, TagOwner[]>();
    for (const doc of djangoTagDocs) {
      for (const [name, kind] of getTagMembers(doc)) {
        const existingOwners = owners.get(name) ?? [];
        existingOwners.push({ docName: doc.name, kind });
        owners.set(name, existingOwners);
      }
    }

    for (const [name, nameOwners] of owners) {
      if (nameOwners.length === 1) {
        continue;
      }

      assert.deepStrictEqual(
        nameOwners.map(({ docName }) => docName).sort(),
        SHARED_DERIVED_NAMES.get(name),
        `${name} has unexpected duplicate owners`,
      );
      assert.ok(nameOwners.every(({ kind }) => kind === "branch"));
    }
  });

  it("assembles every source name and only unique expanded names", () => {
    const expandedNames = new Set(
      djangoTagDocs.flatMap((doc) => getTagMembers(doc).map(([name]) => name)),
    );

    assert.strictEqual(djangoTagDocsByName.size, expandedNames.size);
    for (const name of expandedNames) {
      const lookupDoc = djangoTagDocsByName.get(name);
      assert.strictEqual(lookupDoc?.name, name);
      assert.ok(lookupDoc?.description.trim(), `${name} has no assembled description`);
      assert.ok(lookupDoc?.examples.every((example) => example.trim()));
    }
  });

  it("uses shared Markdown rendering while preserving completion and hover detail", () => {
    const staticDoc = djangoTagDocsByName.get("static")!;
    assert.strictEqual(
      renderTagCompletionDocumentation(staticDoc),
      "`{% static %}`\n\nBuilds the absolute URL for a static asset using Django's configured static files storage.\n\n**Load:** `{% load static %}`\n\n[Documentation](https://docs.djangoproject.com/en/6.0/ref/templates/builtins/#static)",
    );

    const endForDoc = djangoTagDocsByName.get("endfor")!;
    const hover = renderTagHoverDocumentation("endfor", endForDoc);
    assert.ok(hover.startsWith("`{% endfor %}`\n\nCloses a `{% for %}` loop block."));
    assert.ok(hover.includes("**Related tags:** `{% for %}`, `{% empty %}`"));
    assert.ok(hover.includes("#### Usage\n\n```html"));
  });

  it("keeps every concrete snippet tag connected to canonical metadata", () => {
    const snippets = readTagSnippets();

    for (const allowlistedName of SNIPPET_WITHOUT_CANONICAL_TAG_ALLOWLIST) {
      assert.ok(allowlistedName in snippets, `stale snippet allowlist entry ${allowlistedName}`);
    }

    for (const [snippetName, value] of Object.entries(snippets)) {
      if (!isSnippet(value)) {
        continue;
      }

      const tagNames = getSnippetTagNames(value);
      if (tagNames.length === 0) {
        assert.ok(
          SNIPPET_WITHOUT_CANONICAL_TAG_ALLOWLIST.has(snippetName),
          `${snippetName} has no canonical Django tag and is not allowlisted`,
        );
        continue;
      }

      assert.ok(
        !SNIPPET_WITHOUT_CANONICAL_TAG_ALLOWLIST.has(snippetName),
        `${snippetName} no longer needs its allowlist entry`,
      );
      for (const tagName of tagNames) {
        assert.ok(
          djangoTagDocsByName.has(tagName),
          `${snippetName} references unknown tag ${tagName}`,
        );
      }
    }
  });
});
