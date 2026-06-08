import { parsers as htmlParsers, printers as htmlPrinters } from 'prettier/plugins/html';
import { transformTemplate } from './parser/transform';
import { restoreDoc } from './print/restore';

const htmlParser = htmlParsers.html;
const htmlPrinter = htmlPrinters.html;

const languages = [
    {
        name: 'HTML+Django',
        parsers: ['django-html'],
        extensions: ['.html'],
        vscodeLanguageIds: ['html'],
    },
];

const parsers = {
    'django-html': {
        ...htmlParser,
        parse: (text: string, options: Record<string, unknown>) => {
            const { transformed, placeholders } = transformTemplate(text);
            options.__djangoOriginalText = text;
            options.__djangoPlaceholders = placeholders;
            options.originalText = transformed;
            return htmlParser.parse(transformed, options as any);
        },
        astFormat: htmlParser.astFormat,
        locStart: htmlParser.locStart,
        locEnd: htmlParser.locEnd,
    },
};

const printers = {
    html: {
        ...htmlPrinter,
        print(path: Parameters<typeof htmlPrinter.print>[0], options: Record<string, unknown>, print: Parameters<typeof htmlPrinter.print>[2]) {
            const result = htmlPrinter.print(path, options as any, print);
            const placeholders = (options.__djangoPlaceholders as Record<string, string> | undefined) ?? {};
            return restoreDoc(result, placeholders);
        },
    },
};

const options = {};

export { languages, options, parsers, printers };
