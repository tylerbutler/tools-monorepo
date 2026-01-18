import { mkdir } from "node:fs/promises";

/**
 * Vitest global setup to create coverage temp directory before tests run.
 * This prevents a race condition in CI where parallel workers try to write
 * coverage files before the .tmp directory exists.
 */
export async function setup() {
	await mkdir(".coverage/vitest/.tmp", { recursive: true });
}
