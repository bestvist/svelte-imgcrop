import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import babel from "rollup-plugin-babel";
import tyepscript from 'rollup-plugin-typescript2';
import livereload from "rollup-plugin-livereload";

const svelteConfig = require("./svelte.config"); // eslint-disable-line

const production = !process.env.ROLLUP_WATCH;

const extensions = [".js", ".jsx", ".ts", ".tsx"];

export default {
  input: "example/main.ts",
  output: [
    { sourcemap: true, format: "iife", file: "example/public/bundle.js", name: 'app' }
  ],
  plugins: [
    svelte({
      
      // enable run-time checks when not in production
      dev: !production,
      ...svelteConfig
    }),
    resolve({
      extensions,
      browser: true,
      dedupe: importee =>
        importee === "svelte" || importee.startsWith("svelte/")
    }),
    babel({ extensions, exclude: "node_modules/**" }),
    commonjs(),
    tyepscript(),

    !production && livereload("example"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};