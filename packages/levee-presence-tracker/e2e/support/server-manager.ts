import { exec } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVEE_CLIENT_DIR = join(__dirname, "../../../levee-client");
const HEALTH_URL = "http://localhost:4000/health";
const HEALTH_CHECK_TIMEOUT_MS = 30_000;
const HEALTH_CHECK_INTERVAL_MS = 1_000;

async function checkHealth(): Promise<boolean> {
	try {
		const response = await fetch(HEALTH_URL);
		return response.ok;
	} catch {
		return false;
	}
}

async function waitForHealth(timeoutMs: number): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		if (await checkHealth()) {
			return;
		}
		await new Promise((resolve) =>
			setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS),
		);
	}

	throw new Error(`Levee server did not become healthy within ${timeoutMs}ms`);
}

async function startServer(): Promise<void> {
	console.log("Starting Levee server via Docker Compose...");

	try {
		await execAsync("docker compose up -d", {
			cwd: LEVEE_CLIENT_DIR,
		});
		console.log("Docker Compose started, waiting for server to be healthy...");
	} catch (error) {
		throw new Error(`Failed to start Levee server: ${error}`);
	}
}

export async function ensureServerRunning(): Promise<void> {
	console.log("Checking if Levee server is running...");

	if (await checkHealth()) {
		console.log("Levee server is already running and healthy");
		return;
	}

	console.log("Levee server is not running, starting it...");
	await startServer();
	await waitForHealth(HEALTH_CHECK_TIMEOUT_MS);
	console.log("Levee server is now running and healthy");
}
