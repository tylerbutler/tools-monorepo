[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / Logger

# Interface: Logger

Defined in: [packages/sail-infrastructure/src/logging.ts:26](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L26)

A general-purpose logger object.

## Remarks

The `log` method is the primary logging function. The other functions can be used to support logging at different
levels. Methods other than `log` may modify the error message in some way (e.g. by prepending some text to it).

## Properties

### error

```ts
error: ErrorLoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:55](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L55)

Logs an error message without exiting.

#### Remarks

This method logs errors to stderr but does not exit the process. For commands that need to exit
on error, use OCLIF's built-in error() method instead.

***

### formatError()?

```ts
optional formatError: (message) => string;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:65](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L65)

Optional function to format error messages.

#### Parameters

##### message

`string` | `Error`

#### Returns

`string`

***

### info

```ts
info: ErrorLoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L40)

Logs an informational message.

***

### log

```ts
log: LoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:30](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L30)

Logs an error message as-is.

***

### success

```ts
success: LoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:35](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L35)

Logs a success message.

***

### verbose

```ts
verbose: ErrorLoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L60)

Logs a verbose message.

***

### warning

```ts
warning: ErrorLoggingFunction;
```

Defined in: [packages/sail-infrastructure/src/logging.ts:45](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/logging.ts#L45)

Logs a warning message.
