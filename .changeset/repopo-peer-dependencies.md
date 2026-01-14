---
"repopo": minor
---

fix: make sort-tsconfig and sort-package-json peer dependencies

Moves `sort-tsconfig` and `sort-package-json` from dependencies to peerDependencies, allowing consumers to control versions and reducing bundle size.
