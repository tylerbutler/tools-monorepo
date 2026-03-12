---
"repopo": minor
---

Add `CargoLicenceValidated` policy that validates SPDX licence expressions in `Cargo.toml` files using the `spdx-correct` package. Includes a shared SPDX validator (`spdxValidator`) reused by both Cargo and Gleam licence policies.
