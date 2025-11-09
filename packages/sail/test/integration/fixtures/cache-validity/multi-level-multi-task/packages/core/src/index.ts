import { typesFunction } from "@cache-test/types";
import { utilsFunction } from "@cache-test/utils";

export function coreFunction(): string {
	return `core-${utilsFunction()}-${typesFunction()}`;
}
