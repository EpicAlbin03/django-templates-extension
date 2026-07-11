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
  },
  run: {
    cache: true,
  },
});
