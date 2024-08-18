---
"dill-cli": minor
---

Introducing dill, a CLI app to download files and optionally decompress their contents. It also provides a simple programmatic API.

Implementation-wise, dill uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) 
via [node-fetch-native](https://github.com/unjs/node-fetch-native) to download files, which means it is reasonably
cross-platform and will use native Fetch implementations where available.

For more information, see the [dill readme](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/README.md).