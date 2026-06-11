import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { formatDjangoTemplate, formatDjangoJS, formatDjangoTS } from '../src/formatter';

// Strip common leading indentation from a template literal (or use the 'dedent' package)
function dedent(str: string): string {
    const lines = str.split('\n');
    if (lines[0].trim() === '') lines.shift();
    const indent = Math.min(
        ...lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)![1].length)
    );
    return lines.map(l => l.slice(indent)).join('\n').replace(/\s+$/, '');
}

// Tags that were on their own line in the input should remain on their own line
function soloTagLines(text: string): string[] {
    return text
        .split('\n')
        .filter(l => /\{%/.test(l) && l.replace(/(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g, '').trim() === '')
        .map(l => l.trim());
}

function allTags(text: string): string[] {
    return text.match(/(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g) ?? [];
}

// No placeholder strings should leak into the output
function hasLeakedPlaceholders(text: string): boolean {
    return /DJANGOBLOCK\d+|DJANGOINLINE\d+/.test(text);
}

describe('formatDjangoTemplate', () => {
    it('preserves all Django tags', async () => {
        const input = dedent(`
            {% extends "base.html" %}
            {% block content %}
            <p>Hello {{ user.name }}</p>
            {% endblock %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(allTags(output)).toEqual(expect.arrayContaining(allTags(input)));
        expect(allTags(output)).toHaveLength(allTags(input).length);
    });

    it('keeps block tags on their own lines (issue #9)', async () => {
        const input = dedent(`
            {% block foo %}
            Lorem
            ipsum
            {% endblock %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(soloTagLines(output).length).toBeGreaterThanOrEqual(soloTagLines(input).length);
    });

    it('keeps adjacent blocks on separate lines (issue #9)', async () => {
        const input = dedent(`
            {% block foo %}
            content
            {% endblock %}
            {% block bar %}
            more content
            {% endblock %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(soloTagLines(output).length).toBeGreaterThanOrEqual(soloTagLines(input).length);
    });

    it('preserves inline variable tags in attribute values', async () => {
        const input = dedent(`
            <div class="{{ cls }}" id="{{ obj.id }}">
            <p>{{ message }}</p>
            </div>
        `);
        const output = await formatDjangoTemplate(input);
        expect(output).toContain('{{ cls }}');
        expect(output).toContain('{{ obj.id }}');
        expect(output).toContain('{{ message }}');
    });

    it('keeps if/elif/else/endif on their own lines', async () => {
        const input = dedent(`
            {% if user.is_authenticated %}
            <p>Welcome, {{ user.name }}</p>
            {% elif user.is_guest %}
            <p>Welcome, guest</p>
            {% else %}
            <p>Please log in</p>
            {% endif %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(soloTagLines(output).length).toBeGreaterThanOrEqual(soloTagLines(input).length);
    });

    it('indents content inside block tags', async () => {
        const input = dedent(`
            {% block content %}
            <div></div>
            {% endblock %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(output.trim()).toBe(dedent(`
            {% block content %}
              <div></div>
            {% endblock %}
        `));
    });

    it('indents if/else branches inside Django control blocks', async () => {
        const input = dedent(`
            {% if user.is_authenticated %}
            <p>Welcome, {{ user.name }}</p>
            {% else %}
            <p>Please log in</p>
            {% endif %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(output.trim()).toBe(dedent(`
            {% if user.is_authenticated %}
              <p>Welcome, {{ user.name }}</p>
            {% else %}
              <p>Please log in</p>
            {% endif %}
        `));
    });

    it('indents for and empty branches inside loops', async () => {
        const input = dedent(`
            {% for item in items %}
            <li>{{ item }}</li>
            {% empty %}
            <li>No items</li>
            {% endfor %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(output.trim()).toBe(dedent(`
            {% for item in items %}
              <li>{{ item }}</li>
            {% empty %}
              <li>No items</li>
            {% endfor %}
        `));
    });

    it('does not leak placeholder strings into output', async () => {
        const input = dedent(`
            {% block content %}
            <p>{{ message }}</p>
            {% endblock %}
        `);
        const output = await formatDjangoTemplate(input);
        expect(hasLeakedPlaceholders(output)).toBe(false);
    });
});

describe('formatDjangoJS', () => {
    it('preserves Django tags in JavaScript', async () => {
        const input = dedent(`
            const url = "{% url 'home' %}";
            const name = "{{ user.name }}";
        `);
        const output = await formatDjangoJS(input);
        expect(output).toContain("{% url 'home' %}");
        expect(output).toContain('{{ user.name }}');
    });

    it('applies project prettier config when a filepath is provided', async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'django-template-extension'));
        const filePath = path.join(tempDir, 'templates', 'example.js');

        try {
            await writeFile(path.join(tempDir, '.prettierrc'), JSON.stringify({
                singleQuote: true,
                semi: false
            }));
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, '');

            const output = await formatDjangoJS('const value = "hello";', filePath);

            expect(output).toContain("const value = 'hello'");
            expect(output).not.toContain(';');
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it('reloads prettier config after it changes on disk', async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'django-template-extension'));
        const filePath = path.join(tempDir, 'templates', 'example.js');
        const configPath = path.join(tempDir, '.prettierrc');

        try {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, '');

            await writeFile(configPath, JSON.stringify({ singleQuote: true }));
            const firstOutput = await formatDjangoJS('const value = "hello"', filePath);
            expect(firstOutput).toContain("const value = 'hello'");

            await writeFile(configPath, JSON.stringify({}));
            const secondOutput = await formatDjangoJS('const value = "hello"', filePath);
            expect(secondOutput).toContain('const value = "hello"');
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

describe('formatDjangoTS', () => {
    it('preserves Django tags in TypeScript', async () => {
        const input = dedent(`
            const url: string = "{% url 'home' %}";
            const name: string = "{{ user.name }}";
        `);
        const output = await formatDjangoTS(input);
        expect(output).toContain("{% url 'home' %}");
        expect(output).toContain('{{ user.name }}');
    });
});
