# dill-cli

## 0.1.0

### Minor Changes

- Introducing dill, a CLI app to download files and optionally decompress their contents. It also provides a simple programmatic API. _[`#8`](https://github.com/tylerbutler/tools-monorepo/pull/8) [`dac542b`](https://github.com/tylerbutler/tools-monorepo/commit/dac542b02484b11a16f2efc8a1e6dd02dcb2b611) [@tylerbutler](https://github.com/tylerbutler)_

  Implementation-wise, dill uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
  via [node-fetch-native](https://github.com/unjs/node-fetch-native) to download files, which means it is reasonably
  cross-platform and will use native Fetch implementations where available.

  For more information, see the [dill readme](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/README.md).

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943)

</small>

- `@tylerbu/cli-api@0.3.0`

</details>
