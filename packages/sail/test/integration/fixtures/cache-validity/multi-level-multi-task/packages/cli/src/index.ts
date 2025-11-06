import { coreFunction } from "@cache-test/core";
import { parserFunction } from "@cache-test/parser";
import { validationFunction } from "@cache-test/validation";

export function cliFunction(): string {
	return `cli-${coreFunction()}-${validationFunction()}-${parserFunction()}`;
}
