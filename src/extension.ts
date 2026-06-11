import * as vscode from 'vscode';
import { formatDjangoTemplate, formatDjangoJS, formatDjangoTS, formatDjangoXML } from './formatter';
import { DjangoTagWrapManager } from './tagWrapper';

export function activate(context: vscode.ExtensionContext) {
    console.log('Django Template Extension is active');

    // Get configuration
    const config = vscode.workspace.getConfiguration('djangoTemplateExtension');

    // Setup Django tag wrapper (/* */ on open, remove on save)
    const wrapTagsConfig = config.get('wrapDjangoTagsInComments', true);
    const tagWrapManager = new DjangoTagWrapManager();
    tagWrapManager.setEnabled(wrapTagsConfig as boolean);
    context.subscriptions.push(tagWrapManager);

    // Register command to set file as Django HTML
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'djangoTemplateExtension.setAsDjangoHTML',
            async () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await vscode.languages.setTextDocumentLanguage(editor.document, 'django-html');
                    vscode.window.showInformationMessage('Language set to Django HTML');
                }
            }
        )
    );

    // Register commands for Django tag wrapping
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'djangoTemplateExtension.wrapDjangoTags',
            () => tagWrapManager.wrapCurrentDocument()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'djangoTemplateExtension.unwrapDjangoTags',
            () => tagWrapManager.unwrapCurrentDocument()
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'djangoTemplateExtension.toggleTagWrapping',
            async () => {
                const currentValue = vscode.workspace.getConfiguration('djangoTemplateExtension').get('wrapDjangoTagsInComments', true);
                await vscode.workspace.getConfiguration('djangoTemplateExtension').update('wrapDjangoTagsInComments', !currentValue, true);
                tagWrapManager.setEnabled(!currentValue);
                vscode.window.showInformationMessage(`Auto wrap/unwrap Django tags: ${!currentValue ? 'enabled' : 'disabled'}`);
            }
        )
    );

    // Get template folder names from configuration
    const templateFolderNames: string[] = config.get('templateFolderNames', ['templates', 'template']);

    // Create pattern for template folders
    const createTemplatePatterns = (language: string): vscode.DocumentSelector => {
        const patterns: vscode.DocumentFilter[] = [];
        for (const folder of templateFolderNames) {
            patterns.push({ language, scheme: 'file', pattern: `**/${folder}/**` });
        }
        return patterns;
    };

    // Register formatter for django-html language
    const djangoHtmlSelector: vscode.DocumentSelector = { language: 'django-html', scheme: 'file' };
    const djangoHtmlProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
            const fullText = document.getText();
            const formatted = await formatDjangoTemplate(fullText, document.uri.fsPath);
            if (!formatted || formatted === fullText) {
                return [];
            }
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(fullText.length));
            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(djangoHtmlSelector, djangoHtmlProvider)
    );

    // Register formatter for HTML files in template folders
    const htmlSelectors = createTemplatePatterns('html');
    const htmlProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument) {
            if (!await shouldFormat(document)) return [];
            const text = document.getText();
            const formatted = await formatDjangoTemplate(text, document.uri.fsPath);
            if (!formatted || formatted === text) return [];
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(htmlSelectors, htmlProvider)
    );

    // Register formatter for JavaScript files in template folders
    const jsSelectors = createTemplatePatterns('javascript');
    const jsProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument) {
            if (!await shouldFormat(document)) return [];
            const text = document.getText();
            const formatted = await formatDjangoJS(text, document.uri.fsPath);
            if (!formatted || formatted === text) return [];
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(jsSelectors, jsProvider)
    );

    // Register formatter for TypeScript files in template folders
    const tsSelectors = createTemplatePatterns('typescript');
    const tsProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument) {
            if (!await shouldFormat(document)) return [];
            const text = document.getText();
            const formatted = await formatDjangoTS(text, document.uri.fsPath);
            if (!formatted || formatted === text) return [];
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(tsSelectors, tsProvider)
    );

    // Register formatter for XML files in template folders
    const xmlSelectors = createTemplatePatterns('xml');
    const xmlProvider: vscode.DocumentFormattingEditProvider = {
        async provideDocumentFormattingEdits(document: vscode.TextDocument) {
            if (!await shouldFormat(document)) return [];
            const text = document.getText();
            const formatted = await formatDjangoXML(text, document.uri.fsPath);
            if (!formatted || formatted === text) return [];
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            return [vscode.TextEdit.replace(fullRange, formatted)];
        }
    };
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(xmlSelectors, xmlProvider)
    );
}

export function deactivate() {
    // cleanup if necessary
}

/**
 * Determines if formatting should be applied to the document
 */
async function shouldFormat(document: vscode.TextDocument): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('djangoTemplateExtension');

    if (!config.get('enableFormatting', true)) {
        return false;
    }

    if (config.get('autoDetectPythonProject', true)) {
        return await isInPythonProject(document);
    }

    return true;
}

/**
 * Checks if the document belongs to a Python project
 */
async function isInPythonProject(document: vscode.TextDocument): Promise<boolean> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) return false;

    const patterns = ['manage.py', 'pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile'];
    for (const p of patterns) {
        const matches = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, p),
            null,
            1
        );
        if (matches && matches.length > 0) return true;
    }
    return false;
}
