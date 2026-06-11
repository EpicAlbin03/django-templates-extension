const esbuild = require('esbuild');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.js',
        external: ['vscode'],
        logLevel: 'silent',
        // Define __filename and __dirname for bundled code
        define: {
            'import.meta.url': 'importMetaUrl',
        },
        banner: {
            js: `
                const importMetaUrl = require('url').pathToFileURL(__filename).href;
            `.trim(),
        },
        plugins: [
            {
                name: 'esbuild-problem-matcher',
                setup(build) {
                    build.onStart(() => {
                        console.log('[watch] build started');
                    });
                    build.onEnd(result => {
                        result.errors.forEach(({ text, location }) => {
                            console.error(`✘ [ERROR] ${text}`);
                            console.error(`    ${location.file}:${location.line}:${location.column}:`);
                        });
                        console.log('[watch] build finished');
                    });
                }
            }
        ]
    });

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
