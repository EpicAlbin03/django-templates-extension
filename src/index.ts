import type { Parser, Printer, SupportLanguage } from 'prettier';
import type { DjangoNode } from './ast';
import { parse } from './parser';
import { embed, getVisitorKeys, print } from './printer';

const PLUGIN_KEY = 'django-html';

const languages: SupportLanguage[] = [
    {
        name: 'HTML+Django',
        parsers: [PLUGIN_KEY],
        extensions: ['.html'],
        vscodeLanguageIds: ['html'],
    },
];

const parsers = {
    [PLUGIN_KEY]: <Parser<DjangoNode>>{
        astFormat: PLUGIN_KEY,
        parse,
        locStart: (node) => node.index,
        locEnd: (node) => node.index + node.length,
    },
};

const printers = {
    [PLUGIN_KEY]: <Printer<DjangoNode>>{
        print,
        embed,
        getVisitorKeys,
    },
};

const options = {};

export { languages, options, parsers, printers };
