import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

import wasm from "vite-plugin-wasm";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
  plugins: [
    wasm(),
    importMetaUrlPlugin,
    // needed to polyfill NodeJS modules like 'util' used in some dependencies
    nodePolyfills(),
  ],
  // leading dot needed to run from any path
  base: "./",
  //base: '/tools/playground/kgc/',
  resolve: {
    dedupe: ["vscode"],
  },
});
