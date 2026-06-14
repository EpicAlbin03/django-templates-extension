import * as assert from "assert"
import {
	Range,
	Position,
	CompletionItem,
	CompletionItemKind,
	InsertTextFormat,
	CompletionTriggerKind,
	FoldingRange,
	DocumentHighlightKind
} from "vscode-languageserver"
import { HTMLPlugin } from "../../../src/plugins"
import { DocumentManager, Document } from "../../../src/lib/documents"
import { LSConfigManager } from "../../../src/ls-config"
import { DocumentHighlight } from "vscode-languageserver-types"
import { FileSystemProvider } from "../../../src/lib/FileSystemProvider"

describe("HTML Plugin", () => {
	function setup(content: string) {
		const document = new Document("file:///hello.html", content)
		const docManager = new DocumentManager(() => document)
		const configManager = new LSConfigManager()
		const plugin = new HTMLPlugin(docManager, configManager, new FileSystemProvider(), [])
		docManager.openClientDocument(<any>"some doc")
		return { plugin, document, configManager }
	}

	function setFoldingRangeCapability(configManager: LSConfigManager) {
		configManager.updateClientCapabilities({
			textDocument: { foldingRange: { lineFoldingOnly: true } }
		})
	}

	it("does not provide hover info for component having the same name as a html element but being uppercase", async () => {
		const { plugin, document } = setup("<Div></Div>")

		assert.deepStrictEqual(plugin.doHover(document, Position.create(0, 2)), null)
	})

	it("provides completions", async () => {
		const { plugin, document } = setup("<")

		const completions = await plugin.getCompletions(document, Position.create(0, 1))
		assert.ok(Array.isArray(completions && completions.items))
		assert.ok(completions!.items.length > 0)

		assert.deepStrictEqual(completions!.items[0], <CompletionItem>{
			label: "!DOCTYPE",
			kind: CompletionItemKind.Property,
			documentation: "A preamble for an HTML document.",
			textEdit: {
				newText: "!DOCTYPE html>",
				range: {
					start: { line: 0, character: 1 },
					end: { line: 0, character: 1 }
				}
			},
			insertTextFormat: InsertTextFormat.PlainText
		})
	})

	it("skip HTML completions for non-HTML trigger characters", async () => {
		const { plugin, document } = setup("<div><div>")

		const completions = await plugin.getCompletions(document, Position.create(0, 5), {
			triggerCharacter: ">",
			triggerKind: CompletionTriggerKind.TriggerCharacter
		})
		assert.strictEqual(completions, null)
	})

	it("provide emmet completions with >", async () => {
		const { plugin, document } = setup("div>")

		const completions = await plugin.getCompletions(document, Position.create(0, 5), {
			triggerCharacter: ">",
			triggerKind: CompletionTriggerKind.TriggerCharacter
		})
		assert.strictEqual(completions?.items[0]?.label, "div>")
	})

	it("skip emmet completions right after start tag close", async () => {
		const { plugin, document } = setup("Test.a>")

		const completions = await plugin.getCompletions(document, Position.create(0, 5), {
			triggerCharacter: ">",
			triggerKind: CompletionTriggerKind.TriggerCharacter
		})
		assert.strictEqual(completions, null)
	})

	it("does not provide rename for element being uppercase", async () => {
		const { plugin, document } = setup("<Div></Div>")

		assert.deepStrictEqual(plugin.prepareRename(document, Position.create(0, 2)), null)
		assert.deepStrictEqual(plugin.rename(document, Position.create(0, 2), "p"), null)
	})

	it("provides rename for element", () => {
		const { plugin, document } = setup('<div class="x"></div>')
		const newName = "p"

		const pepareRenameInfo = Range.create(Position.create(0, 1), Position.create(0, 4))
		assert.deepStrictEqual(plugin.prepareRename(document, Position.create(0, 2)), pepareRenameInfo)
		assert.deepStrictEqual(plugin.prepareRename(document, Position.create(0, 18)), pepareRenameInfo)

		const renameInfo = {
			changes: {
				[document.uri]: [
					{
						newText: "p",
						range: {
							start: { line: 0, character: 1 },
							end: { line: 0, character: 4 }
						}
					},
					{
						newText: "p",
						range: {
							start: { line: 0, character: 17 },
							end: { line: 0, character: 20 }
						}
					}
				]
			}
		}
		assert.deepStrictEqual(plugin.rename(document, Position.create(0, 2), newName), renameInfo)
		assert.deepStrictEqual(plugin.rename(document, Position.create(0, 18), newName), renameInfo)
	})

	it("provides linked editing ranges", async () => {
		const { plugin, document } = setup("<div></div>")

		const ranges = plugin.getLinkedEditingRanges(document, Position.create(0, 3))
		assert.deepStrictEqual(ranges, {
			ranges: [
				{ start: { line: 0, character: 1 }, end: { line: 0, character: 4 } },
				{ start: { line: 0, character: 7 }, end: { line: 0, character: 10 } }
			],
			wordPattern:
				"(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\^\\&\\*\\(\\)\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\<\\>\\/\\s]+)"
		})
	})

	it("provides folding range", () => {
		const { plugin, document, configManager } = setup("<div>\n  <div>\n  </div>\n  </div>")
		setFoldingRangeCapability(configManager)

		const ranges = plugin.getFoldingRanges(document)
		assert.deepStrictEqual(ranges, <FoldingRange[]>[{ startLine: 0, endLine: 2 }])
	})

	it("provide document highlight", () => {
		const { plugin, document } = setup("<div></div>")

		const highlight = plugin.findDocumentHighlight(document, Position.create(0, 1))

		assert.deepStrictEqual(highlight, <DocumentHighlight[]>[
			{
				range: {
					start: {
						line: 0,
						character: 1
					},
					end: {
						line: 0,
						character: 4
					}
				},
				kind: DocumentHighlightKind.Read
			},
			{
				range: {
					start: {
						line: 0,
						character: 7
					},
					end: {
						line: 0,
						character: 10
					}
				},
				kind: DocumentHighlightKind.Read
			}
		])
	})
})
