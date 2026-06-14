import { urlToPath } from "../../utils"
import { WritableDocument } from "./DocumentBase"
import { extractScriptTags, extractStyleTag, extractTemplateTag, TagInformation } from "./utils"
import { parseHtml } from "./parseHtml"
import { HTMLDocument } from "vscode-html-languageservice"
import { Range } from "vscode-languageserver"

/**
 * Represents an HTML document that may contain Django template syntax.
 */
export class Document extends WritableDocument {
	languageId = "html"
	scriptInfo: TagInformation | null = null
	moduleScriptInfo: TagInformation | null = null
	styleInfo: TagInformation | null = null
	templateInfo: TagInformation | null = null
	html!: HTMLDocument
	openedByClient = false
	/**
	 * Compute and cache directly for performance because it is queried often.
	 */
	private path = urlToPath(this.url)

	constructor(public url: string, public content: string) {
		super()
		this.updateDocInfo()
	}

	static createForTest(url: string, content: string) {
		return new Document(url, content)
	}

	private updateDocInfo() {
		this.html = parseHtml(this.content)
		const scriptTags = extractScriptTags(this.content, this.html)
		this.scriptInfo = scriptTags?.script || null
		this.moduleScriptInfo = scriptTags?.moduleScript || null
		this.styleInfo = extractStyleTag(this.content, this.html)
		this.templateInfo = extractTemplateTag(this.content, this.html)
	}

	/**
	 * Get text content.
	 */
	getText(range?: Range): string {
		if (range) {
			return this.content.substring(this.offsetAt(range.start), this.offsetAt(range.end))
		}
		return this.content
	}

	/**
	 * Set text content and increase the document version.
	 */
	setText(text: string) {
		this.content = text
		this.version++
		this.lineOffsets = undefined
		this.updateDocInfo()
	}

	/**
	 * Returns the file path if the URL scheme is `file`.
	 */
	getFilePath(): string | null {
		return this.path
	}

	/**
	 * Get the document URL.
	 */
	getURL() {
		return this.url
	}

	/**
	 * Returns the language associated with script, style, or template.
	 * Returns an empty string if nothing is set.
	 */
	getLanguageAttribute(tag: "script" | "style" | "template"): string {
		const attrs =
			(tag === "style"
				? this.styleInfo?.attributes
				: tag === "script"
					? this.scriptInfo?.attributes || this.moduleScriptInfo?.attributes
					: this.templateInfo?.attributes) || {}
		const lang = attrs.lang || attrs.type || ""
		return lang.replace(/^text\//, "")
	}

	/**
	 * Returns true if there is a `lang="X"` on script, style, or template.
	 */
	hasLanguageAttribute(): boolean {
		return (
			!!this.getLanguageAttribute("script") ||
			!!this.getLanguageAttribute("style") ||
			!!this.getLanguageAttribute("template")
		)
	}
}
