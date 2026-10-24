---
title: Using the dill API
description: A guide to using the dill API to download an decompress files.
sidebar:
  order: 2
---

Usage guide is coming soon, but in the meantime, see the [API reference for the download function.](/api/functions/download/)

## Safe archive extraction

When `extract` is enabled, dill validates every tar and zip entry before writing any files. Entries that would resolve outside `downloadDir` are rejected, including POSIX and Windows traversal paths, absolute paths, drive-qualified paths, and UNC paths. If an unsafe entry is found, extraction fails without writing archive contents.
