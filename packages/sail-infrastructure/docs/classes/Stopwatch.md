[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / Stopwatch

# Class: Stopwatch

Defined in: [packages/sail-infrastructure/src/stopwatch.ts:12](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/stopwatch.ts#L12)

A stopwatch used for outputting messages to the terminal along with timestamp information.
The stopwatch is started upon creation, and each call to `log` will include the recorded time.

## Constructors

### Constructor

```ts
new Stopwatch(enabled, logFunc): Stopwatch;
```

Defined in: [packages/sail-infrastructure/src/stopwatch.ts:16](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/stopwatch.ts#L16)

#### Parameters

##### enabled

`boolean`

##### logFunc

[`LoggingFunction`](../type-aliases/LoggingFunction.md) = `defaultLogger.log`

#### Returns

`Stopwatch`

## Properties

### logFunc

```ts
protected logFunc: LoggingFunction = defaultLogger.log;
```

Defined in: [packages/sail-infrastructure/src/stopwatch.ts:18](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/stopwatch.ts#L18)

## Methods

### getTotalTime()

```ts
getTotalTime(): number;
```

Defined in: [packages/sail-infrastructure/src/stopwatch.ts:41](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/stopwatch.ts#L41)

#### Returns

`number`

***

### log()

```ts
log(msg?, print?): number;
```

Defined in: [packages/sail-infrastructure/src/stopwatch.ts:21](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/stopwatch.ts#L21)

#### Parameters

##### msg?

`string`

##### print?

`boolean`

#### Returns

`number`
