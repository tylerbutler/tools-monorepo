---
editUrl: false
next: false
prev: false
title: "repopo"
---

# repopo API

Repository policy authoring, execution, and CLI entry point.

Import `repopo/api` for the programmatic API without the CLI entry point.

## Classes

- [Policy](/api/classes/policy/)
- [PolicyRunner](/api/classes/policyrunner/)

## Interfaces

- [ConfiguredFilePolicy](/api/interfaces/configuredfilepolicy/)
- [DefineCargoPolicyArgs](/api/interfaces/definecargopolicyargs/)
- [DefineFileHeaderPolicyArgs](/api/interfaces/definefileheaderpolicyargs/)
- [DefineGleamPolicyArgs](/api/interfaces/definegleampolicyargs/)
- [DefinePackagePolicyArgs](/api/interfaces/definepackagepolicyargs/)
- [FileHeaderGeneratorConfig](/api/interfaces/fileheadergeneratorconfig/)
- [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/)
- [FluidAdapterOptions](/api/interfaces/fluidadapteroptions/)
- [FluidHandler](/api/interfaces/fluidhandler/)
- [PolicyArgs](/api/interfaces/policyargs/)
- [PolicyError](/api/interfaces/policyerror/)
- [~~PolicyFailure~~](/api/interfaces/policyfailure/)
- [PolicyFileResult](/api/interfaces/policyfileresult/)
- [~~PolicyFixResult~~](/api/interfaces/policyfixresult/)
- [PolicyHandlerPerfStats](/api/interfaces/policyhandlerperfstats/)
- [PolicyInstanceSettings](/api/interfaces/policyinstancesettings/)
- [PolicyOptions](/api/interfaces/policyoptions/)
- [PolicyRepositoryResult](/api/interfaces/policyrepositoryresult/)
- [PolicyRunnerOptions](/api/interfaces/policyrunneroptions/)
- [PolicyRunResults](/api/interfaces/policyrunresults/)
- [PolicyShape](/api/interfaces/policyshape/)
- [RepopoConfig](/api/interfaces/repopoconfig/)
- [RepositoryPolicyArgs](/api/interfaces/repositorypolicyargs/)
- [RepositoryPolicyDefinition](/api/interfaces/repositorypolicydefinition/)
- [RepositoryPolicyFinding](/api/interfaces/repositorypolicyfinding/)

## Type Aliases

- [AnyPolicyShape](/api/type-aliases/anypolicyshape/)
- [CargoToml](/api/type-aliases/cargotoml/)
- [CargoTomlHandler](/api/type-aliases/cargotomlhandler/)
- [ConfiguredPolicy](/api/type-aliases/configuredpolicy/)
- [ConfiguredRepositoryPolicy](/api/type-aliases/configuredrepositorypolicy/)
- [ExcludedPolicyFileMap](/api/type-aliases/excludedpolicyfilemap/)
- [GleamToml](/api/type-aliases/gleamtoml/)
- [GleamTomlHandler](/api/type-aliases/gleamtomlhandler/)
- [IdentifiedPolicy](/api/type-aliases/identifiedpolicy/)
- [PackageJsonHandler](/api/type-aliases/packagejsonhandler/)
- [PolicyAction](/api/type-aliases/policyaction/)
- [~~PolicyDefinition~~](/api/type-aliases/policydefinition/)
- [~~PolicyDefinitionInput~~](/api/type-aliases/policydefinitioninput/)
- [PolicyExecutionResult](/api/type-aliases/policyexecutionresult/)
- [~~PolicyFunctionArguments~~](/api/type-aliases/policyfunctionarguments/)
- [PolicyHandler](/api/type-aliases/policyhandler/)
- [PolicyHandlerResult](/api/type-aliases/policyhandlerresult/)
- [~~PolicyInstance~~](/api/type-aliases/policyinstance/)
- [PolicyInstanceId](/api/type-aliases/policyinstanceid/)
- [PolicyName](/api/type-aliases/policyname/)
- [PolicyResolver](/api/type-aliases/policyresolver/)
- [PolicyResult](/api/type-aliases/policyresult/)
- [~~PolicyStandaloneResolver~~](/api/type-aliases/policystandaloneresolver/)
- [RepositoryPolicyHandler](/api/type-aliases/repositorypolicyhandler/)
- [RepositoryPolicyResult](/api/type-aliases/repositorypolicyresult/)

## Functions

- [defineCargoPolicy](/api/functions/definecargopolicy/)
- [defineFileHeaderPolicy](/api/functions/definefileheaderpolicy/)
- [defineGleamPolicy](/api/functions/definegleampolicy/)
- [definePackagePolicy](/api/functions/definepackagepolicy/)
- [fromFluidHandlers](/api/functions/fromfluidhandlers/)
- [isPolicyError](/api/functions/ispolicyerror/)
- [~~isPolicyFailure~~](/api/functions/ispolicyfailure/)
- [~~isPolicyFixResult~~](/api/functions/ispolicyfixresult/)
- [~~makePolicy~~](/api/functions/makepolicy/)
- [~~makePolicyDefinition~~](/api/functions/makepolicydefinition/)
- [policy](/api/functions/policy/)

## References

### generatePackagePolicy

Renames and re-exports [definePackagePolicy](/api/functions/definepackagepolicy/)
