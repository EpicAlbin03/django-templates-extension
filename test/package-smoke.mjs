import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const rootPlugin = require('prettier-plugin-django-templates');
assert.ok(rootPlugin.languages?.some((language) => language.parsers?.includes('django-html')));
assert.ok(rootPlugin.parsers?.['django-html']);
assert.ok(rootPlugin.printers?.['django-html']);

const browserPlugin = await import('prettier-plugin-django-templates/browser');
assert.ok(browserPlugin.languages?.some((language) => language.parsers?.includes('django-html')));
assert.ok(browserPlugin.parsers?.['django-html']);
assert.ok(browserPlugin.printers?.['django-html']);
