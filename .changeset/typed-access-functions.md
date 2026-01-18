---
"ccl-ts": minor
---

Add typed access functions for type-safe value retrieval from CCL objects

- `getString()`: Extract string values with type validation
- `getInt()`: Parse integer strings with strict validation
- `getBool()`: Parse boolean strings (true/false, case-insensitive)
- `getFloat()`: Parse floating-point strings with validation
- `getList()`: Access list values with automatic empty-key list detection

All functions use variadic path arguments for navigation (e.g., `getString(obj, "server", "host")`).
