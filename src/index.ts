import type { Parser, Printer, SupportLanguage } from "prettier";
import type { DjangoNode } from "./ast.js";
import { parse } from "./parser.js";
import { embed, getVisitorKeys, print } from "./printer.js";

const PLUGIN_KEY = "django-html";

const languages: SupportLanguage[] = [
  {
    name: "HTML+Django",
    parsers: [PLUGIN_KEY],
    extensions: [".html"],
    vscodeLanguageIds: ["html"],
  },
];

const parsers = {
  [PLUGIN_KEY]: {
    astFormat: PLUGIN_KEY,
    parse,
    locStart: (node) => node.index,
    locEnd: (node) => node.index + node.length,
  } as Parser<DjangoNode>,
};

const printers = {
  [PLUGIN_KEY]: {
    print,
    embed,
    getVisitorKeys,
  } as Printer<DjangoNode>,
};

const options = {};

export { languages, options, parsers, printers };
