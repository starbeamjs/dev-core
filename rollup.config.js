import { createRequire } from "node:module";

import { defineConfig } from "rollup";

const require = createRequire(new URL(".", import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const ts = /** @type {import("rollup-plugin-ts").default} */ (
  require("rollup-plugin-ts")
);

export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      format: "esm",
      file: "dist/index.js",
      sourcemap: true,
    },
  ],

  plugins: [
    {
      name: "externals",
      resolveId(id) {
        if (id === "@swc/helpers") return { id, external: false };
        if (id.startsWith("node:")) return { id, external: true };
      },
    },

    ts({
      transpiler: "swc",
      transpileOnly: true,
    }),
  ],
});
