import test from 'ava';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { format } from 'prettier';
import * as DjangoPlugin from '../../src';

let dirs = readdirSync('test/formatting/samples');
const printerFilesHaveOnly = readdirSync('test/printer/samples').some((f) =>
    f.endsWith('.only.html'),
);
const endsWithOnly = (f: string): boolean => f.endsWith('.only');
const hasOnly = printerFilesHaveOnly || dirs.some(endsWithOnly);
dirs = !hasOnly ? dirs : dirs.filter(endsWithOnly);

if (process.env.CI && hasOnly) {
    throw new Error('.only tests present');
}

for (const dir of dirs) {
    if (dir.endsWith('.skip')) continue;

    const input = readFileSync(`test/formatting/samples/${dir}/input.html`, 'utf-8').replace(
        /\r?\n/g,
        '\n',
    );
    const expectedOutput = readFileSync(
        `test/formatting/samples/${dir}/output.html`,
        'utf-8',
    ).replace(/\r?\n/g, '\n');
    const options = readOptions(`test/formatting/samples/${dir}/options.json`);

    test(`formatting: ${dir}`, async (t) => {
        const actualOutput = await format(input, {
            parser: 'django-html',
            plugins: [DjangoPlugin],
            ...options,
        });

        t.is(expectedOutput, actualOutput, `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`);

        const actualOutput2 = await format(actualOutput, {
            parser: 'django-html',
            plugins: [DjangoPlugin],
            ...options,
        });

        t.is(
            expectedOutput,
            actualOutput2,
            `Reprint failed. Expected:\n${expectedOutput}\n\nActual:\n${actualOutput2}`,
        );
    });
}

function readOptions(fileName: string) {
    if (!existsSync(fileName)) {
        return {};
    }

    const fileContents = readFileSync(fileName, 'utf-8');
    return JSON.parse(fileContents);
}
