import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "dist",
      "pnpm-lock.yaml",
      "repos",
      ".agents",
      ".changeset",
      ".vite-hooks",
      "**/test/syntax/manual/**",
      "test.html",
      "screenshot.html",
    ],
    useTabs: false,
    printWidth: 100,
    semi: true,
    trailingComma: "all",
    singleQuote: false,
  },
  lint: {
    ignorePatterns: ["dist", "pnpm-lock.yaml", "repos", ".agents", "**/test/syntax/manual/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "repos/**", "**/dist/**"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.ts"],
      // Generated/static catalog data is excluded; executable feature code remains measured.
      exclude: [
        "packages/language-server/src/plugins/django/djangoCompletions.ts",
        "packages/language-server/src/plugins/django/djangoTagsCore.ts",
        "packages/language-server/src/plugins/django/djangoTagsContrib.ts",
        "packages/language-server/src/plugins/django/djangoTagsThirdParty.ts",
      ],
      // Initial floor from the first complete Plan 04 report; ratchet these upward over time.
      thresholds: {
        statements: 80,
        branches: 77,
        functions: 74,
        lines: 80,
      },
    },
  },
  run: {
    cache: true,
  },
});
