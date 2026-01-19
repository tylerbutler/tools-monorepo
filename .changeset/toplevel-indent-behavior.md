---
"ccl-test-runner-ts": patch
---

Add `toplevel_indent` behavior support for test filtering

The test runner now supports the `toplevel_indent` behavior option which controls how indentation is handled for top-level entries. This enables implementations to specify whether they use `toplevel_indent_strip` (remove leading indentation) or `toplevel_indent_preserve` (keep original indentation) behavior.
