import { configFunction } from "@cache-test/config";
import { utilsFunction } from "@cache-test/utils";

export function formatterFunction(): string {
	return `formatter-${utilsFunction()}-${configFunction()}`;
}
