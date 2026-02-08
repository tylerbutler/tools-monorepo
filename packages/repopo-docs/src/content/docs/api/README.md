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

## Classes

- [Policy](/api/classes/policy/)

## Interfaces

- [ConfiguredPolicy](/api/interfaces/configuredpolicy/)
- [DefineFileHeaderPolicyArgs](/api/interfaces/definefileheaderpolicyargs/)
- [DefinePackagePolicyArgs](/api/interfaces/definepackagepolicyargs/)
- [FileHeaderGeneratorConfig](/api/interfaces/fileheadergeneratorconfig/)
- [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/)
- [FluidAdapterOptions](/api/interfaces/fluidadapteroptions/)
- [FluidHandler](/api/interfaces/fluidhandler/)
- [PolicyArgs](/api/interfaces/policyargs/)
- [PolicyError](/api/interfaces/policyerror/)
- [PolicyFailure](/api/interfaces/policyfailure/)
- [PolicyFixResult](/api/interfaces/policyfixresult/)
- [PolicyInstanceSettings](/api/interfaces/policyinstancesettings/)
- [PolicyOptions](/api/interfaces/policyoptions/)
- [PolicyShape](/api/interfaces/policyshape/)
- [RepopoConfig](/api/interfaces/repopoconfig/)

## Type Aliases

- [PackageJsonHandler](/api/type-aliases/packagejsonhandler/)
- [PolicyDefinition](/api/type-aliases/policydefinition/)
- [PolicyDefinitionInput](/api/type-aliases/policydefinitioninput/)
- [PolicyFunctionArguments](/api/type-aliases/policyfunctionarguments/)
- [PolicyHandler](/api/type-aliases/policyhandler/)
- [PolicyHandlerResult](/api/type-aliases/policyhandlerresult/)
- [PolicyInstance](/api/type-aliases/policyinstance/)
- [PolicyName](/api/type-aliases/policyname/)
- [PolicyResolver](/api/type-aliases/policyresolver/)
- [PolicyResult](/api/type-aliases/policyresult/)
- [PolicyStandaloneResolver](/api/type-aliases/policystandaloneresolver/)

## Functions

- [defineFileHeaderPolicy](/api/functions/definefileheaderpolicy/)
- [fromFluidHandlers](/api/functions/fromfluidhandlers/)
- [generatePackagePolicy](/api/functions/generatepackagepolicy/)
- [isPolicyError](/api/functions/ispolicyerror/)
- [isPolicyFailure](/api/functions/ispolicyfailure/)
- [isPolicyFixResult](/api/functions/ispolicyfixresult/)
- [makePolicy](/api/functions/makepolicy/)
- [makePolicyDefinition](/api/functions/makepolicydefinition/)
- [policy](/api/functions/policy/)
