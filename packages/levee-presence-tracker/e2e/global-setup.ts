import { ensureServerRunning } from "./support/server-manager.ts";

export default async function globalSetup(): Promise<void> {
	await ensureServerRunning();
}
