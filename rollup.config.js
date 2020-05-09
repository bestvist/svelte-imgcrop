import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import { terser } from "rollup-plugin-terser";

import pkg from './package.json';

const production = !process.env.ROLLUP_WATCH;

const svelteConfig = require("./svelte.config"); // eslint-disable-line

export default {
    input: 'src/index.svelte',
    output: { file: pkg.main, format: 'umd', name: 'svelte-imgcrop' },
    plugins: [
        typescript(),
        svelte({...svelteConfig}),
        resolve(),
        production && terser()
    ]
}