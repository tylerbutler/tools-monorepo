---
editUrl: false
next: false
prev: false
title: "repopo"
---

# repopo API

A tool for enforcing repository policies and standards across codebases.

## Remarks

Repopo provides a framework for defining and enforcing policies across repositories,
such as file headers, package.json consistency, and other code standards.
It can be used as a CLI tool or integrated into CI/CD pipelines.

## Interfaces

- [FileHeaderGeneratorConfig](/api/interfaces/fileheadergeneratorconfig/)
- [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/)
- [FluidAdapterOptions](/api/interfaces/fluidadapteroptions/)
- [FluidHandler](/api/interfaces/fluidhandler/)
- [PolicyDefinition](/api/interfaces/policydefinition/)
- [PolicyFailure](/api/interfaces/policyfailure/)
- [PolicyFixResult](/api/interfaces/policyfixresult/)
- [PolicyFunctionArguments](/api/interfaces/policyfunctionarguments/)
- [PolicyInstanceSettings](/api/interfaces/policyinstancesettings/)
- [RepopoConfig](/api/interfaces/repopoconfig/)

## Type Aliases

- [PackageJsonHandler](/api/type-aliases/packagejsonhandler/)
- [PolicyHandler](/api/type-aliases/policyhandler/)
- [PolicyHandlerResult](/api/type-aliases/policyhandlerresult/)
- [PolicyInstance](/api/type-aliases/policyinstance/)
- [PolicyName](/api/type-aliases/policyname/)
- [PolicyStandaloneResolver](/api/type-aliases/policystandaloneresolver/)

## Functions

- [defineFileHeaderPolicy](/api/functions/definefileheaderpolicy/)
- [fromFluidHandlers](/api/functions/fromfluidhandlers/)
- [generatePackagePolicy](/api/functions/generatepackagepolicy/)
- [makePolicy](/api/functions/makepolicy/)
