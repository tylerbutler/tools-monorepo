import { configFunction } from "@cache-test/config";
import { typesFunction } from "@cache-test/types";

export function validationFunction(): string {
	return `validation-${typesFunction()}-${configFunction()}`;
}
