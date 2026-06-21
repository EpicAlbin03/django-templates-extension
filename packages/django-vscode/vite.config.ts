import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/extension.ts"],
    dts: false,
    format: "cjs",
    deps: {
      neverBundle: ["vscode"],
    },
  },
});
