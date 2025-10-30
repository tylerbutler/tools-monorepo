[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / Logger

# Interface: Logger

Defined in: packages/sail-infrastructure/src/logging.ts:26

A general-purpose logger object.

## Remarks

The `log` method is the primary logging function. The other functions can be used to support logging at different
levels. Methods other than `log` may modify the error message in some way (e.g. by prepending some text to it).

## Properties

### errorLog

```ts
errorLog: ErrorLoggingFunction;
```

Defined in: packages/sail-infrastructure/src/logging.ts:51

Logs an error message.

#### Remarks

This method is not named 'error' because it conflicts with the method that oclif has on its Command class.
That method exits the process in addition to logging, so this method exists to differentiate, and provide
error logging that doesn't exit the process.

***

### info

```ts
info: ErrorLoggingFunction;
```

Defined in: packages/sail-infrastructure/src/logging.ts:35

Logs an informational message.

***

### log

```ts
log: LoggingFunction;
```

Defined in: packages/sail-infrastructure/src/logging.ts:30

Logs an error message as-is.

***

### verbose

```ts
verbose: ErrorLoggingFunction;
```

Defined in: packages/sail-infrastructure/src/logging.ts:56

Logs a verbose message.

***

### warning

```ts
warning: ErrorLoggingFunction;
```

Defined in: packages/sail-infrastructure/src/logging.ts:40

Logs a warning message.
