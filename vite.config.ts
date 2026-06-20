import { defineConfig } from "vite-plus"

export default defineConfig({
	staged: {
		"*": "vp check --fix"
	},
	fmt: {
		ignorePatterns: [
			"dist",
			"test/**/*.html",
			"pnpm-lock.yaml",
			"repos",
			".agents",
			"README.md",
			".changeset"
		],
		useTabs: false,
		printWidth: 100,
		semi: true,
		trailingComma: "all",
		singleQuote: false
	},
	lint: {
		ignorePatterns: ["dist", "test/**/*.html", "pnpm-lock.yaml", "repos", ".agents"],
		jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
		rules: { "vite-plus/prefer-vite-plus-imports": "error" },
		options: { typeAware: true, typeCheck: true }
	},
	run: {
		cache: true
	}
})
