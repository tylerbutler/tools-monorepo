import { createLeftConfig } from "@test/left";
import { createRightConfig } from "@test/right";

export function main(): void {
	const left = createLeftConfig();
	const right = createRightConfig();
	console.log(`Left: ${left.name}, Right: ${right.name}`);
}
