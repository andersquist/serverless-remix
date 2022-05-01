import path from "path";
import babel from "@rollup/plugin-babel";
import nodeResolve from "@rollup/plugin-node-resolve";

function isBareModuleId(id) {
  return !id.startsWith(".") && !path.isAbsolute(id);
}

export default function rollup(options) {
  let builds = [
    {
      external(id) {
        return isBareModuleId(id);
      },
      input: "index.ts",
      output: {
        dir: "dist",
        format: "cjs",
        preserveModules: true,
        exports: "auto",
      },
      plugins: [
        babel({
          babelHelpers: "bundled",
          exclude: /node_modules/,
          extensions: [".ts", ".tsx"],
        }),
        nodeResolve({ extensions: [".ts", ".tsx"] }),
      ],
    },
  ];

  return builds;
}
