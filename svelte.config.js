const sveltePreprocess = require("svelte-preprocess");

module.exports = {
  preprocess: sveltePreprocess({
    typescript: {
      transpileOnly: true,
      compilerOptions: {
        noEmit: false
      }
    }
  })
};