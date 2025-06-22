---
editUrl: false
next: false
prev: false
title: "download"
---

> **download**(`url`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DownloadResponse`](/api/interfaces/downloadresponse/)\>

Defined in: api.ts:288
Defined in: [api.ts:289](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/src/api.ts#L289)

Downloads a file from a URL. By default, the file will be downloaded to the current directory, and will not be
	decompressed. These options are configurable by passing a [DillOptions](/api/interfaces/dilloptions/) object.

## Parameters

### url

The URL to download.

`string` | `URL`

### options?

[`DillOptions`](/api/interfaces/dilloptions/)

Options to use. See [DillOptions](/api/interfaces/dilloptions/).

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DownloadResponse`](/api/interfaces/downloadresponse/)\>

A [DownloadResponse](/api/interfaces/downloadresponse/) which includes the downloaded data and the file path to the downloaded file, if
the file was saved.
