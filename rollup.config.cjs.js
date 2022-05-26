import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "lib_cjs/index.cjs",
    format: "cjs",
  },
  external: ["typescript"],
  plugins: [typescript()],
};
