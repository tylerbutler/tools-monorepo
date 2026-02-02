---
"@tylerbu/sorted-btree-es6": minor
---

Convert btree-typescript fork to ES2020 output

- Target ES2020 instead of ES5 for smaller, more efficient output
- Use node16 module resolution
- Replace uglify-js with terser for minification
- Exclude extended/ functionality (has ES2020 compatibility issues)
- Add transformation script for maintaining fork after upstream pulls
