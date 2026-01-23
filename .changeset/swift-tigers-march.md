---
"repopo": patch
---

Refactor to use Effection 4 for structured concurrency

- Replace manual async handling with Effection's structured concurrency primitives
- Policy handlers now support generator functions for better cancellation and resource management
- Improved internal architecture for concurrent policy execution
- Added comprehensive test coverage for async/generator patterns
