---
editUrl: false
next: false
prev: false
title: "makePolicy"
---

## Call Signature

> **makePolicy**\<`D`\>(`definition`, ...`options`): [`ConfiguredFilePolicy`](/api/index/type-aliases/configuredfilepolicy/)\<`ConfigOf`\<`D`\>\>

Defined in: makePolicy.ts:31

Configure a file definition using a single options object.

### Type Parameters

#### D

`D` *extends* [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`unknown`\>

### Parameters

#### definition

`D`

#### options

...`OptionsFor`\<`D`\>

### Returns

[`ConfiguredFilePolicy`](/api/index/type-aliases/configuredfilepolicy/)\<`ConfigOf`\<`D`\>\>

## Call Signature

> **makePolicy**\<`D`\>(`definition`, ...`options`): [`ConfiguredRepositoryPolicy`](/api/index/type-aliases/configuredrepositorypolicy/)\<`ConfigOf`\<`D`\>\>

Defined in: makePolicy.ts:36

Configure a repository definition using a single options object.

### Type Parameters

#### D

`D` *extends* [`RepositoryPolicyDefinition`](/api/index/interfaces/repositorypolicydefinition/)\<`unknown`\>

### Parameters

#### definition

`D`

#### options

...`OptionsFor`\<`D`\>

### Returns

[`ConfiguredRepositoryPolicy`](/api/index/type-aliases/configuredrepositorypolicy/)\<`ConfigOf`\<`D`\>\>

## Call Signature

> **makePolicy**\<`D`\>(`definition`, ...`options`): [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)\<`ConfigOf`\<`D`\>\>

Defined in: makePolicy.ts:41

Configure a common-union definition without losing scope discrimination.

### Type Parameters

#### D

`D` *extends* [`PolicyDefinition`](/api/index/type-aliases/policydefinition/)\<`unknown`\>

### Parameters

#### definition

`D`

#### options

...`OptionsFor`\<`D`\>

### Returns

[`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)\<`ConfigOf`\<`D`\>\>
