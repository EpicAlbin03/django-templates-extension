import { defineConfig } from "vite-plus";

const lspDependencies = /^vscode-(?:jsonrpc|languageserver(?:-.+)?|uri)(?:\/|$)/;

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    dts: true,
    format: "esm",
    deps: {
      alwaysBundle: [lspDependencies],
      neverBundle: [/^prettier(?:\/|$)/, /^prettier-plugin-django-templates(?:\/|$)/],
      dts: {
        neverBundle: [lspDependencies],
      },
    },
  },
});
