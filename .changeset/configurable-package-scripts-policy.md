---
"repopo": minor
---

Add configurable PackageScripts policy

Enhances the `PackageScripts` policy with flexible configuration options to enforce package.json script requirements across your repository. The policy now supports two validation modes:

1. **Required Scripts (`must`)**: Specify scripts that must be present in all package.json files
2. **Mutually Exclusive Scripts (`mutuallyExclusive`)**: Define groups of scripts where exactly one from each group must exist

Example configuration:

```typescript
makePolicy(PackageScripts, {
  must: ["build", "clean"],
  mutuallyExclusive: [
    ["test", "test:unit"],  // Either "test" or "test:unit", not both
  ],
})
```

The policy validates that:
- All scripts in the `must` array are present
- For each group in `mutuallyExclusive`, exactly one script from that group exists (not zero, not multiple)

This is useful for enforcing consistent npm script conventions across monorepo packages while allowing flexibility where needed.
