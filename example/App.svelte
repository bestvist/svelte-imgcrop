<script lang="ts">
  import ImgCrop from "../src/index.svelte";

  let img = "/images/demo.png";

  function change(e) {
    console.log(e.detail);
  }
</script>

<ImgCrop src={img} on:change={change} />
