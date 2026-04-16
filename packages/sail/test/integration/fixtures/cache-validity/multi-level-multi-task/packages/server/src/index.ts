import { coreFunction } from "@cache-test/core";
import { formatterFunction } from "@cache-test/formatter";

export function serverFunction(): string {
	return `server-${coreFunction()}-${formatterFunction()}`;
}
