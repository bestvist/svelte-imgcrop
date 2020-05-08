# svelte-imgcrop

![npm version](https://img.shields.io/npm/v/svelte-imgcrop.svg)
![npm downloads](https://img.shields.io/npm/dt/svelte-imgcrop.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

A svelte component for image crop. (Svelte 图片裁剪组件)

## Demo 示例

[click me](https://svelte.dev/repl/5c96541fe7644e2f944299b195d83d37?version=3.22.2)

## Env 环境

svelte@3 + rollup@2

## Install 安装

```
npm install svelte-imgcrop
```

## Usage 使用

```html
<script lang="ts">
  import ImgCrop from "svelte-imgcrop";

  let img = "/images/demo.png";
</script>

<ImgCrop src={img} />
```

### Options 配置项

**Prop**

| Prop | Type | Default | Desc |
|--|--|--|--|
| src | string | '' | The image to be cropped |
| width | Number | 400 | Container width |
| height | Number | 300 | Container height |

**Events**

| Name | Desc |
|--|--|
| change | Crop success,params(e) |
