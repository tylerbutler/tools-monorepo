#!/usr/bin/env -S node --loader ts-node/esm --no-warnings=ExperimentalWarning

import { execute, settings } from "@oclif/core";

if (process.argv[2]?.startsWith("snapshot:")) {
	settings.enableAutoTranspile = false;
}

await execute({ development: true, dir: import.meta.url });
