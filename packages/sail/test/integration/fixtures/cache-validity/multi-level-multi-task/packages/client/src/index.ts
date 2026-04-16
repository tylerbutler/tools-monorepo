import { formatterFunction } from "@cache-test/formatter";
import { parserFunction } from "@cache-test/parser";

export function clientFunction(): string {
	return `client-${parserFunction()}-${formatterFunction()}`;
}
