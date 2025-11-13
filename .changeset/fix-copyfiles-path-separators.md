---
"@tylerbu/sail": patch
---

Fix copyfiles warnings due to path separator mismatch

The CopyfilesTask was incorrectly mixing POSIX path separators (forward slashes) with OS-native path operations, causing output file path calculations to fail on Windows. This resulted in warnings about being unable to generate content for done files (e.g., "WARNING: unable to generate content for copyfiles-5c0eb27a.done.build.log").

Fixed by removing the unnecessary `toPosixPath()` conversion and consistently using OS-native paths throughout the `getOutputFiles()` method.
