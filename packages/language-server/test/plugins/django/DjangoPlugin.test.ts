import * as assert from "assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "vite-plus/test";
import { Document } from "../../../src/lib/documents/index.js";
import { LSConfigManager } from "../../../src/ls-config.js";
import { DjangoPlugin } from "../../../src/plugins/index.js";

describe("DjangoPlugin", () => {
  it("formats Django template tags with the bundled Prettier plugin", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "django-template-format-")), "template.html");
    const text = "<div>{% if user %}<span>{{ user.username }}</span>{% endif %}</div>\n";
    writeFileSync(filePath, text);

    const document = new Document(pathToFileURL(filePath).toString(), text);
    const plugin = new DjangoPlugin(new LSConfigManager());

    const edits = await plugin.formatDocument(document, { tabSize: 2, insertSpaces: true });

    assert.strictEqual(edits.length, 1);
    assert.strictEqual(
      edits[0].newText,
      `<div>
  {% if user %}
    <span>{{ user.username }}</span>
  {% endif %}
</div>
`,
    );
  });
});
