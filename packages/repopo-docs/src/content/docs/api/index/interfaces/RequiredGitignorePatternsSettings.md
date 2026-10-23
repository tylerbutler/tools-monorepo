---
editUrl: false
next: false
prev: false
title: "RequiredGitignorePatternsSettings"
---

Defined in: [policies/RequiredGitignorePatterns.ts:9](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredGitignorePatterns.ts#L9)

Policy settings for the RequiredGitignorePatterns repo policy.

## Properties

### patterns

> **patterns**: (`string` \| \{ `comment?`: `string`; `pattern`: `string`; \})[]

Defined in: [policies/RequiredGitignorePatterns.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequiredGitignorePatterns.ts#L14)

Array of patterns that must be present in .gitignore.
Each pattern can be a string or an object with pattern and comment.
