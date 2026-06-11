import * as vscode from 'vscode';

const DJANGO_TAG_REGEX = /(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|\{#[\s\S]*?#\})/g;
const WRAPPED_TAG_REGEX = /\/\*\s*(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|\{#[\s\S]*?#\})\s*\*\//g;

// Decoration type for hiding the /* and */ around Django tags - make them nearly invisible
const hiddenCommentDecorationType = vscode.window.createTextEditorDecorationType({
    opacity: '0.15',
    letterSpacing: '-0.5em'
});

// Decoration type for highlighting Django tags inside strings (without /* */)
const djangoTagInStringDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 200, 0, 0.15)',
    borderRadius: '3px'
});

/**
 * Check if a position is inside a string literal (single, double, or template)
 */
type StringContextChecker = (position: number) => boolean;

function createStringContextChecker(content: string): StringContextChecker {
    let idx = 0;

    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplateString = false;
    let templateExprDepth = 0; // Only meaningful when inTemplateString === true

    let inLineComment = false;
    let inBlockComment = false;

    const reset = () => {
        idx = 0;
        inSingleQuote = false;
        inDoubleQuote = false;
        inTemplateString = false;
        templateExprDepth = 0;
        inLineComment = false;
        inBlockComment = false;
    };

    const advanceTo = (target: number) => {
        while (idx < target && idx < content.length) {
            const char = content[idx];
            const nextChar = idx + 1 < content.length ? content[idx + 1] : '';

            // Handle comment bodies first
            if (inLineComment) {
                if (char === '\n') {
                    inLineComment = false;
                }
                idx++;
                continue;
            }

            if (inBlockComment) {
                if (char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    idx += 2; // consume */
                    continue;
                }
                idx++;
                continue;
            }

            // Start of comments (only when not inside a normal string; template TEXT is handled separately)
            if (!inSingleQuote && !inDoubleQuote && (!inTemplateString || templateExprDepth > 0)) {
                if (char === '/' && nextChar === '/') {
                    inLineComment = true;
                    idx += 2; // consume //
                    continue;
                }
                if (char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    idx += 2; // consume /*
                    continue;
                }
            }

            // Escapes inside quotes (template TEXT, single, double)
            if (char === '\\' && (inSingleQuote || inDoubleQuote || (inTemplateString && templateExprDepth === 0))) {
                idx += 2; // skip escaped char
                continue;
            }

            // Toggle template string (only when not inside single/double)
            if (char === '`' && !inSingleQuote && !inDoubleQuote && templateExprDepth === 0) {
                inTemplateString = !inTemplateString;
                idx++;
                continue;
            }

            // Template string TEXT (not inside ${...}): treat everything as string content
            if (inTemplateString && templateExprDepth === 0) {
                if (char === '$' && nextChar === '{') {
                    templateExprDepth = 1;
                    idx += 2; // consume ${
                    continue;
                }
                idx++;
                continue;
            }

            // Inside ${...} expression of a template string: track nesting of braces when not in quotes
            if (inTemplateString && templateExprDepth > 0 && !inSingleQuote && !inDoubleQuote) {
                if (char === '{') {
                    templateExprDepth++;
                    idx++;
                    continue;
                }
                if (char === '}') {
                    templateExprDepth--;
                    idx++;
                    continue;
                }
            }

            // Toggle single/double quotes (only when not inside the other quote type)
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                idx++;
                continue;
            }

            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                idx++;
                continue;
            }

            idx++;
        }
    };

    return (position: number) => {
        if (position < idx) {
            reset();
        }
        advanceTo(position);
        return inSingleQuote || inDoubleQuote || (inTemplateString && templateExprDepth === 0);
    };
}

/**
 * Wraps Django template tags with block comments for TypeScript/JavaScript compatibility.
 * Only wraps tags that are not already wrapped and not inside strings.
 */
export function wrapDjangoTags(content: string): string {
    // First, find all positions of already wrapped tags
    const wrappedPositions: Set<number> = new Set();
    let wrappedMatch;
    const wrappedCopy = new RegExp(WRAPPED_TAG_REGEX.source, 'g');
    while ((wrappedMatch = wrappedCopy.exec(content)) !== null) {
        // Store the position of the inner Django tag
        const innerTagStart = wrappedMatch.index + wrappedMatch[0].indexOf(wrappedMatch[1]);
        wrappedPositions.add(innerTagStart);
    }

    // Now replace only unwrapped Django tags
    const tagCopy = new RegExp(DJANGO_TAG_REGEX.source, 'g');
    let result = '';
    let lastIndex = 0;
    let match;

    const isInsideStringAt = createStringContextChecker(content);

    while ((match = tagCopy.exec(content)) !== null) {
        // Check if this tag is already wrapped (by checking if its position is in wrappedPositions)
        let isWrapped = false;
        for (const pos of wrappedPositions) {
            if (Math.abs(pos - match.index) < 5) {
                isWrapped = true;
                break;
            }
        }

        // Check if the tag is inside a string literal
        const isInString = isInsideStringAt(match.index);

        result += content.substring(lastIndex, match.index);

        if (isWrapped || isInString) {
            // Don't wrap if already wrapped or inside a string
            result += match[0];
        } else {
            result += `/* ${match[0]} */`;
        }

        lastIndex = tagCopy.lastIndex;
    }

    result += content.substring(lastIndex);
    return result;
}

/**
 * Unwraps Django template tags by removing block comment wrappers.
 */
export function unwrapDjangoTags(content: string): string {
    return content.replace(WRAPPED_TAG_REGEX, (_, djangoTag) => {
        return djangoTag;
    });
}

/**
 * Check if content has any Django tags (wrapped or unwrapped)
 */
export function hasDjangoTags(content: string): boolean {
    const tagRegex = new RegExp(DJANGO_TAG_REGEX.source, 'g');
    return tagRegex.test(content);
}

/**
 * Check if content has unwrapped Django tags
 */
export function hasUnwrappedDjangoTags(content: string): boolean {
    // Get all Django tags
    const tagRegex = new RegExp(DJANGO_TAG_REGEX.source, 'g');
    let match;

    while ((match = tagRegex.exec(content)) !== null) {
        const tagStart = match.index;
        // Check if preceded by /* (with optional whitespace)
        const before = content.substring(Math.max(0, tagStart - 10), tagStart);
        if (!before.trimEnd().endsWith('/*')) {
            return true;
        }
        // Also check if followed by */ (with optional whitespace)
        const tagEnd = tagStart + match[0].length;
        const after = content.substring(tagEnd, Math.min(content.length, tagEnd + 10));
        if (!after.trimStart().startsWith('*/')) {
            return true;
        }
    }

    return false;
}

/**
 * Check if content has wrapped Django tags
 */
export function hasWrappedDjangoTags(content: string): boolean {
    const wrappedRegex = new RegExp(WRAPPED_TAG_REGEX.source, 'g');
    return wrappedRegex.test(content);
}

/**
 * Apply decorations to hide the \/* and *\/ around Django tags
 * and highlight Django tags inside strings
*/
export function applyHiddenCommentDecorations(editor: vscode.TextEditor): void {
    const document = editor.document;
    const content = document.getText();
    const hiddenDecorations: vscode.DecorationOptions[] = [];
    const stringTagDecorations: vscode.DecorationOptions[] = [];

    // Regex to find /* before Django tags and */ after them
    const wrapperRegex = /(\/\*)\s*(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}|\{#[\s\S]*?#\})\s*(\*\/)/g;
    let match;

    while ((match = wrapperRegex.exec(content)) !== null) {
        // Position of /*
        const openStart = document.positionAt(match.index);
        const openEnd = document.positionAt(match.index + match[1].length + 1); // +1 for space

        // Position of */
        const closeStart = document.positionAt(match.index + match[0].length - match[3].length - 1); // -1 for space
        const closeEnd = document.positionAt(match.index + match[0].length);

        hiddenDecorations.push({ range: new vscode.Range(openStart, openEnd) });
        hiddenDecorations.push({ range: new vscode.Range(closeStart, closeEnd) });
    }

    const isInsideStringAt = createStringContextChecker(content);

    // Find Django tags inside strings (not wrapped with /* */)
    const tagRegex = new RegExp(DJANGO_TAG_REGEX.source, 'g');
    while ((match = tagRegex.exec(content)) !== null) {
        // Check if this tag is inside a string
        if (isInsideStringAt(match.index)) {
            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);
            stringTagDecorations.push({ range: new vscode.Range(start, end) });
        }
    }

    editor.setDecorations(hiddenCommentDecorationType, hiddenDecorations);
    editor.setDecorations(djangoTagInStringDecorationType, stringTagDecorations);
}

/**
 * Clear hidden comment decorations from an editor
 */
export function clearHiddenCommentDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(hiddenCommentDecorationType, []);
    editor.setDecorations(djangoTagInStringDecorationType, []);
}

/**
 * Manager class for handling Django tag wrapping/unwrapping
 */
export class DjangoTagWrapManager implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private wrappedDocuments: Set<string> = new Set();
    private isSaving: boolean = false;
    private isOpening: boolean = false;
    private enabled: boolean = true;
    private decorationDebounceHandle: ReturnType<typeof setTimeout> | undefined;
    // Track documents recently closed to detect saves triggered by closing the last editor
    private recentlyClosedDocs: Map<string, number> = new Map();
    private closedDocTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
    // Tunable delay and TTL constants
    private readonly RECHECK_DELAY_MS: number = 150;
    private readonly CLOSE_DOC_TTL_MS: number = 2000;

    constructor() {
        this.setupListeners();
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    private setupListeners(): void {
        // When a document is opened:
        // - JS/TS: wrap Django tags
        // - JSX/TSX: do NOT wrap (React syntax conflict); if wrappers exist, remove them
        this.disposables.push(
            vscode.workspace.onDidOpenTextDocument((document) => {
                this.onDocumentOpen(document);
            })
        );

        // Before saving, unwrap Django tags
        this.disposables.push(
            vscode.workspace.onWillSaveTextDocument((event) => {
                this.onWillSave(event);
            })
        );

        // After saving, re-wrap Django tags
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                this.onDidSave(document);
            })
        );

        // Cleanup when a document is fully closed
        this.disposables.push(
            vscode.workspace.onDidCloseTextDocument((document) => {
                const uriStr = document.uri.toString();
                // Record the close so onDidSave can detect it if save happens as part of closing
                this.recentlyClosedDocs.set(uriStr, Date.now());
                // Schedule cleanup of the record
                if (this.closedDocTimers.has(uriStr)) {
                    clearTimeout(this.closedDocTimers.get(uriStr));
                }
                const timer = setTimeout(() => {
                    this.recentlyClosedDocs.delete(uriStr);
                    this.closedDocTimers.delete(uriStr);
                }, this.CLOSE_DOC_TTL_MS);
                this.closedDocTimers.set(uriStr, timer);

                // Remove from wrappedDocuments as the doc is being closed
                this.wrappedDocuments.delete(uriStr);
            })
        );

        // Apply decorations when editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor && this.isDecorationTargetLanguage(editor.document.languageId)) {
                    // On editor switch, apply immediately.
                    this.clearDecorationDebounce();
                    this.updateDecorations(editor);
                }
            })
        );

        // Apply decorations when document content changes
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === event.document && this.isDecorationTargetLanguage(event.document.languageId)) {
                    // Debounce decoration updates while typing.
                    this.scheduleDecorationUpdate(editor);
                }
            })
        );

        // Process already open documents
        for (const document of vscode.workspace.textDocuments) {
            this.onDocumentOpen(document);
        }

        // Apply decorations to current editor
        if (vscode.window.activeTextEditor && this.isDecorationTargetLanguage(vscode.window.activeTextEditor.document.languageId)) {
            this.updateDecorations(vscode.window.activeTextEditor);
        }
    }

    private clearDecorationDebounce(): void {
        if (this.decorationDebounceHandle) {
            clearTimeout(this.decorationDebounceHandle);
            this.decorationDebounceHandle = undefined;
        }
    }

    private scheduleDecorationUpdate(editor: vscode.TextEditor): void {
        const uri = editor.document.uri.toString();

        if (this.decorationDebounceHandle) {
            clearTimeout(this.decorationDebounceHandle);
        }

        this.decorationDebounceHandle = setTimeout(() => {
            this.decorationDebounceHandle = undefined;

            const active = vscode.window.activeTextEditor;
            if (!active) return;
            if (active.document.uri.toString() !== uri) return;
            if (!this.isDecorationTargetLanguage(active.document.languageId)) return;

            this.updateDecorations(active);
        }, 150);
    }

    private updateDecorations(editor: vscode.TextEditor): void {
        if (!this.enabled) {
            clearHiddenCommentDecorations(editor);
            return;
        }
        applyHiddenCommentDecorations(editor);
    }

    /**
     * Languages where we apply decorations (hide wrappers and highlight tags inside strings).
     */
    private isDecorationTargetLanguage(languageId: string): boolean {
        return languageId === 'typescript' ||
            languageId === 'javascript' ||
            languageId === 'typescriptreact' ||
            languageId === 'javascriptreact';
    }

    /**
     * True when the document is a .js/.ts file where wrapping is allowed.
     * (A .js file can be in javascriptreact mode, então a decisão é por extensão.)
     */
    private isWrapAllowedForDocument(document: vscode.TextDocument): boolean {
        if (!this.isDecorationTargetLanguage(document.languageId)) return false;

        const fileName = (document.uri.scheme === 'file' ? document.uri.fsPath : document.fileName).toLowerCase();
        return fileName.endsWith('.js') || fileName.endsWith('.ts');
    }

    /**
     * True when the document is a .jsx/.tsx file where wrapping must be disabled.
     */
    private isWrapDisabledForDocument(document: vscode.TextDocument): boolean {
        if (!this.isDecorationTargetLanguage(document.languageId)) return false;

        const fileName = (document.uri.scheme === 'file' ? document.uri.fsPath : document.fileName).toLowerCase();
        return fileName.endsWith('.jsx') || fileName.endsWith('.tsx');
    }

    private isDocumentOpenInAnyTab(uri: vscode.Uri): boolean {
        const target = uri.toString();

        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                const input = tab.input;

                if (input instanceof vscode.TabInputText) {
                    if (input.uri.toString() === target) return true;
                } else if (input instanceof vscode.TabInputTextDiff) {
                    if (input.modified.toString() === target) return true;
                    if (input.original.toString() === target) return true;
                }
            }
        }

        return false;
    }

    private async onDocumentOpen(document: vscode.TextDocument): Promise<void> {
        if (!this.enabled) return;
        if (this.isOpening || this.isSaving) return;
        const content = document.getText();

        // JSX/TSX (.jsx/.tsx): never wrap; if wrappers exist from a previous version, remove them
        if (this.isWrapDisabledForDocument(document)) {
            if (!hasWrappedDjangoTags(content)) return;

            this.isOpening = true;
            try {
                const unwrapped = unwrapDjangoTags(content);
                if (unwrapped !== content) {
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(content.length)
                    );
                    edit.replace(document.uri, fullRange, unwrapped);
                    await vscode.workspace.applyEdit(edit);
                    this.wrappedDocuments.delete(document.uri.toString());
                }
            } finally {
                this.isOpening = false;
            }
            return;
        }

        // JS/TS: wrap unwrapped tags
        if (this.isWrapAllowedForDocument(document)) {
            if (!hasUnwrappedDjangoTags(content)) return;

            this.isOpening = true;
            try {
                const wrapped = wrapDjangoTags(content);
                if (wrapped !== content) {
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(content.length)
                    );
                    edit.replace(document.uri, fullRange, wrapped);
                    await vscode.workspace.applyEdit(edit);
                    this.wrappedDocuments.add(document.uri.toString());
                }
            } finally {
                this.isOpening = false;
            }
            return;
        }
    }

    private onWillSave(event: vscode.TextDocumentWillSaveEvent): void {
        if (!this.enabled) return;
        const document = event.document;
        const content = document.getText();

        // JSX/TSX (.jsx/.tsx): never wrap; ensure wrappers are removed before saving
        if (this.isWrapDisabledForDocument(document)) {
            const unwrapped = unwrapDjangoTags(content);
            if (unwrapped !== content) {
                const edit = new vscode.TextEdit(
                    new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(content.length)
                    ),
                    unwrapped
                );
                event.waitUntil(Promise.resolve([edit]));
                this.wrappedDocuments.delete(document.uri.toString());
            }
            return;
        }

        // JS/TS: unwrap only for documents we previously wrapped, then re-wrap after save
        if (this.isWrapAllowedForDocument(document)) {
            if (!this.wrappedDocuments.has(document.uri.toString())) return;

            this.isSaving = true;

            const unwrapped = unwrapDjangoTags(content);
            if (unwrapped !== content) {
                const edit = new vscode.TextEdit(
                    new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(content.length)
                    ),
                    unwrapped
                );
                event.waitUntil(Promise.resolve([edit]));
            }
            return;
        }
    }

    private async onDidSave(document: vscode.TextDocument): Promise<void> {
        if (!this.enabled) return;
        if (!this.isSaving) return;
        if (!this.isWrapAllowedForDocument(document)) return;

        // Clear saving flag (we're already in onDidSave)
        this.isSaving = false;

        const uriStr = document.uri.toString();

        // Allow the close event to run first (race condition: onDidSave may fire before onDidCloseTextDocument)
        await new Promise((resolve) => setTimeout(resolve, this.RECHECK_DELAY_MS));

        // If the save happened as part of closing the last tab, avoid re-wrapping.
        // Also treat the document as closed if it was recorded recently in recentlyClosedDocs.
        if (this.recentlyClosedDocs.has(uriStr)) {
            // cleanup timer if present
            if (this.closedDocTimers.has(uriStr)) {
                clearTimeout(this.closedDocTimers.get(uriStr));
                this.closedDocTimers.delete(uriStr);
            }
            this.recentlyClosedDocs.delete(uriStr);
            this.wrappedDocuments.delete(uriStr);
            return;
        }

        // Re-check if document is open in any tab (may have been closed during delay)
        if (!this.isDocumentOpenInAnyTab(document.uri)) {
            this.wrappedDocuments.delete(uriStr);
            return;
        }

        // Re-wrap Django tags after saving (only if not closed and still open in a tab)
        const content = document.getText();
        if (hasUnwrappedDjangoTags(content)) {
            const wrapped = wrapDjangoTags(content);
            if (wrapped !== content) {
                // Double check again right before applying edit
                if (this.recentlyClosedDocs.has(uriStr) || !this.isDocumentOpenInAnyTab(document.uri)) {
                    this.wrappedDocuments.delete(uriStr);
                    return;
                }

                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(content.length)
                );
                edit.replace(document.uri, fullRange, wrapped);
                await vscode.workspace.applyEdit(edit);
                this.wrappedDocuments.add(uriStr);
            }
        }
    }

    /**
     * Manually wrap Django tags in the current document
     */
    public async wrapCurrentDocument(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        if (!this.isWrapAllowedForDocument(document)) {
            vscode.window.showWarningMessage('This command only works with TypeScript/JavaScript files');
            return;
        }

        const content = document.getText();
        const wrapped = wrapDjangoTags(content);

        if (wrapped !== content) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
            );
            edit.replace(document.uri, fullRange, wrapped);
            await vscode.workspace.applyEdit(edit);
            this.wrappedDocuments.add(document.uri.toString());
            vscode.window.showInformationMessage('Django tags wrapped with /* */');
        } else {
            vscode.window.showInformationMessage('No Django tags to wrap');
        }
    }

    /**
     * Manually unwrap Django tags in the current document
     */
    public async unwrapCurrentDocument(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const content = document.getText();
        const unwrapped = unwrapDjangoTags(content);

        if (unwrapped !== content) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(content.length)
            );
            edit.replace(document.uri, fullRange, unwrapped);
            await vscode.workspace.applyEdit(edit);
            this.wrappedDocuments.delete(document.uri.toString());
            vscode.window.showInformationMessage('Django tags unwrapped');
        } else {
            vscode.window.showInformationMessage('No wrapped Django tags found');
        }
    }

    public dispose(): void {
        this.clearDecorationDebounce();
        for (const d of this.disposables) {
            d.dispose();
        }
        // Clear any pending timers for recently closed documents
        for (const t of this.closedDocTimers.values()) {
            clearTimeout(t);
        }
        this.closedDocTimers.clear();
        this.recentlyClosedDocs.clear();
    }
}
