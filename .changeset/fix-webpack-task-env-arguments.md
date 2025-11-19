---
"@tylerbu/sail": patch
---

Fix WebpackTask getEnvArguments method missing return statement

The WebpackTask.getEnvArguments() method was building the environment arguments object but not returning it, causing all --env flags to be ignored during webpack execution. This fix adds the missing return statement, allowing webpack environment variables to be properly passed through.
