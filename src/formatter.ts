import * as prettier from 'prettier';

let cachedXmlPlugin: any | null = null;
let didTryLoadXmlPlugin = false;

function getXmlPlugin(): any | null {
    if (didTryLoadXmlPlugin) return cachedXmlPlugin;
    didTryLoadXmlPlugin = true;

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        cachedXmlPlugin = require('@prettier/plugin-xml');
    } catch {
        cachedXmlPlugin = null;
    }

    return cachedXmlPlugin;
}

async function getPrettierOptions(
    filePath: string | undefined,
    overrides: prettier.Options
): Promise<prettier.Options> {
    const resolvedConfig = filePath
        ? await prettier.resolveConfig(filePath, { useCache: false })
        : null;
    return {
        ...resolvedConfig,
        ...overrides,
        filepath: filePath
    };
}

/**
 * Format Django/Jinja HTML template content
 */
export async function formatDjangoTemplate(text: string, filePath?: string): Promise<string> {
    try {
        const { masked, placeholders } = maskDjangoTagsForHTML(text);
        const options = await getPrettierOptions(filePath, {
            parser: 'html',
            htmlWhitespaceSensitivity: 'ignore'
        });
        const formatted = await prettier.format(masked, options);
        return applyDjangoBlockIndentation(restoreDjangoTagsFromHTML(formatted, placeholders));
    } catch (err) {
        console.error('formatDjangoTemplate failed:', err);
        return text;
    }
}

/**
 * Format JavaScript content with Django template tags preserved
 */
export async function formatDjangoJS(text: string, filePath?: string): Promise<string> {
    const { masked, placeholders } = maskDjangoTags(text);

    try {
        const options = await getPrettierOptions(filePath, { parser: 'babel' });
        const formatted = await prettier.format(masked, options);
        return restoreDjangoTags(formatted, placeholders);
    } catch (err) {
        console.error('formatDjangoJS failed:', err);
        return text;
    }
}

/**
 * Format TypeScript content with Django template tags preserved
 */
export async function formatDjangoTS(text: string, filePath?: string): Promise<string> {
    const { masked, placeholders } = maskDjangoTags(text);

    try {
        const options = await getPrettierOptions(filePath, { parser: 'typescript' });
        const formatted = await prettier.format(masked, options);
        return restoreDjangoTags(formatted, placeholders);
    } catch (err) {
        console.error('formatDjangoTS failed:', err);
        return text;
    }
}

/**
 * Format XML content with Django template tags preserved
 */
export async function formatDjangoXML(text: string, filePath?: string): Promise<string> {
    const { masked, placeholders } = maskDjangoTags(text);

    try {
        const xmlPlugin = getXmlPlugin();

        const options = await getPrettierOptions(filePath, {
            parser: 'xml',
            plugins: xmlPlugin ? [xmlPlugin] : []
        });
        const formatted = await prettier.format(masked, options);
        return restoreDjangoTags(formatted, placeholders);
    } catch (err) {
        console.error('formatDjangoXML failed:', err);
        return text;
    }
}

interface Placeholder {
    key: string;
    original: string;
}

const HTML_TAG_RE = /({{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#})/g;
const DJANGO_BLOCK_INDENT = '  ';
const DJANGO_OPENING_TAGS = new Set([
    'autoescape',
    'block',
    'blocktrans',
    'blocktranslate',
    'comment',
    'filter',
    'for',
    'if',
    'spaceless',
    'verbatim',
    'with'
]);
const DJANGO_MIDDLE_TAGS = new Set(['elif', 'else', 'empty', 'plural']);
const DJANGO_CLOSING_TAGS = new Set([
    'endautoescape',
    'endblock',
    'endblocktrans',
    'endblocktranslate',
    'endcomment',
    'endfilter',
    'endfor',
    'endif',
    'endspaceless',
    'endverbatim',
    'endwith'
]);

/**
 * Mask Django/Jinja template tags for HTML formatting.
 * Lines containing only Django tags get HTML comment placeholders (<!-- ... -->),
 * which Prettier treats as block-level and keeps on their own lines.
 * Tags mixed with other content get plain-text placeholders safe for use
 * inside HTML attribute values.
 */
function maskDjangoTagsForHTML(text: string): { masked: string; placeholders: Placeholder[] } {
    const placeholders: Placeholder[] = [];
    let i = 0;

    const masked = text
        .split('\n')
        .map(line => {
            // If stripping all Django tags leaves only whitespace, the line is block-level
            const isBlockLevel = line.replace(HTML_TAG_RE, '').trim() === '';
            HTML_TAG_RE.lastIndex = 0;
            return line.replace(HTML_TAG_RE, match => {
                const key = isBlockLevel ? `DJANGOBLOCK${i++}` : `DJANGOINLINE${i++}`;
                placeholders.push({ key, original: match });
                return isBlockLevel ? `<!-- ${key} -->` : key;
            });
        })
        .join('\n');

    return { masked, placeholders };
}

/**
 * Restore Django/Jinja template tags masked by maskDjangoTagsForHTML
 */
function restoreDjangoTagsFromHTML(text: string, placeholders: Placeholder[]): string {
    let restored = text;
    for (const p of placeholders) {
        const token = p.key.startsWith('DJANGOBLOCK') ? `<!-- ${p.key} -->` : p.key;
        restored = restored.split(token).join(p.original);
    }
    return restored;
}

function applyDjangoBlockIndentation(text: string): string {
    let depth = 0;

    return text
        .split('\n')
        .map(line => {
            if (line.trim() === '') {
                return line;
            }

            const tagType = getDjangoTagIndentationType(line.trim());
            const effectiveDepth = tagType === 'close' || tagType === 'middle'
                ? Math.max(depth - 1, 0)
                : depth;

            if (tagType === 'open' || tagType === 'middle') {
                depth = effectiveDepth + 1;
            } else if (tagType === 'close') {
                depth = effectiveDepth;
            }

            return `${DJANGO_BLOCK_INDENT.repeat(effectiveDepth)}${line}`;
        })
        .join('\n');
}

function getDjangoTagIndentationType(line: string): 'open' | 'middle' | 'close' | null {
    const match = line.match(/^\{%\s*([a-zA-Z_][\w]*)\b[\s\S]*?%\}$/);
    if (!match) {
        return null;
    }

    const tagName = match[1].toLowerCase();

    if (DJANGO_MIDDLE_TAGS.has(tagName)) {
        return 'middle';
    }

    if (DJANGO_CLOSING_TAGS.has(tagName)) {
        return 'close';
    }

    if (DJANGO_OPENING_TAGS.has(tagName)) {
        return 'open';
    }

    return null;
}

/**
 * Mask Django/Jinja template tags with placeholders
 * Also handles tags wrapped in \/* *\/ comments
*/
function maskDjangoTags(text: string): { masked: string; placeholders: Placeholder[] } {
    // First, handle wrapped tags: {{ ... }} or {% ... %} or {# ... #}
    const wrappedRegex = /(\/\*\s*(?:{{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#})\s*\*\/)/g;
    // Then handle unwrapped tags
    const unwrappedRegex = /({{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#})/g;

    const placeholders: Placeholder[] = [];
    let i = 0;

    // First pass: mask wrapped tags
    let masked = text.replace(wrappedRegex, (match) => {
        const key = `__DJANGO_WRAPPED_${i++}__`;
        placeholders.push({ key, original: match });
        return key;
    });

    // Second pass: mask unwrapped tags (that weren't already masked)
    masked = masked.replace(unwrappedRegex, (match) => {
        const key = `__DJANGO_PLACEHOLDER_${i++}__`;
        placeholders.push({ key, original: match });
        return key;
    });

    return { masked, placeholders };
}

/**
 * Restore Django/Jinja template tags from placeholders
 */
function restoreDjangoTags(text: string, placeholders: Placeholder[]): string {
    let restored = text;
    for (const p of placeholders) {
        restored = restored.split(p.key).join(p.original);
    }
    return restored;
}
