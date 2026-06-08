import test from 'ava';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { format } from 'prettier';
import * as DjangoPlugin from '../../src';

const prettify = (code: string, options: Record<string, unknown>) =>
  format(code, {
    parser: 'django-html',
    plugins: [DjangoPlugin],
    ...options,
  });

const casesDir = 'test/cases/data';
const cases = readdirSync(casesDir);

for (const caseName of cases) {
  if (caseName.startsWith('_')) {
    continue;
  }

  test(`cases: ${caseName}`, async (t) => {
    const base = `${casesDir}/${caseName}`;
    const input = readFileSync(`${base}/input.html`, 'utf-8').replace(/\r?\n/g, '\n');
    const expected = readFileSync(`${base}/expected.html`, 'utf-8').replace(/\r?\n/g, '\n');
    const configPath = `${base}/config.json`;
    const options = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : {};

    const expectedError = expected.match(/Error\(`(?<message>[\s\S]*)`\)/)?.groups?.message;

    if (expectedError) {
      await t.throwsAsync(() => prettify(input, options), {
        message: expectedError,
      });
      return;
    }

    const actual = await prettify(input, options);
    t.is(actual, expected, `Expected:\n${expected}\n\nActual:\n${actual}`);

    const actual2 = await prettify(actual, options);
    t.is(actual2, expected, `Reprint failed. Expected:\n${expected}\n\nActual:\n${actual2}`);
  });
}
