import { typesFunction } from "@cache-test/types";
import { utilsFunction } from "@cache-test/utils";

export function parserFunction(): string {
	return `parser-${utilsFunction()}-${typesFunction()}`;
}
