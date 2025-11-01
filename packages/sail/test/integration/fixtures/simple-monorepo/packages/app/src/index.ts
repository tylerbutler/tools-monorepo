/**
 * Simple application for integration testing.
 * Depends on @test/lib package.
 */

import { add, greet } from "@test/lib";

export function main(): void {
	console.log(greet("World"));
	console.log(`2 + 2 = ${add(2, 2)}`);
}

export { add, greet };
