import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import { resolve } from "pathe";

export const nativeFlags = {
	...CommandWithConfig.flags,
	config: Flags.string({
		char: "c",
		description: "Path to the config file or discovery directory.",
	}),
	"sidecar-path": Flags.string({
		description: "Path to the JavaScript sidecar and preparation scripts.",
		env: "REPOPO_SIDECAR_PATH",
	}),
	"binary-path": Flags.string({
		description: "Path to the repopo-core Rust binary.",
		env: "REPOPO_CORE_PATH",
	}),
	runtime: Flags.string({
		description: "JavaScript runtime for cold preparation or IPC.",
		env: "REPOPO_RUNTIME",
		options: ["auto", "node", "bun"],
	}),
	verbose: Flags.boolean({
		char: "v",
		description: "Show verbose output including cache diagnostics.",
		exclusive: ["quiet"],
	}),
	quiet: Flags.boolean({
		char: "q",
		description: "Suppress all output except errors.",
		exclusive: ["verbose"],
	}),
} as const;

async function resolveBinaryPath(packageRoot: string): Promise<string> {
	const binary =
		process.platform === "win32" ? "repopo-core.exe" : "repopo-core";
	for (const path of [
		resolve(packageRoot, "native", binary),
		resolve(packageRoot, "crates/core/target/release", binary),
		resolve(packageRoot, "crates/core/target/debug", binary),
	]) {
		try {
			await access(path);
			return path;
		} catch (error) {
			if (
				!(error instanceof Error && "code" in error && error.code === "ENOENT")
			) {
				throw error;
			}
		}
	}
	throw new Error(
		"repopo-core binary not found. Install repopo with pnpm or build from source:\n" +
			"cargo build --manifest-path crates/core/Cargo.toml",
	);
}

export async function runNative(
	command: "check" | "prepare",
	args: string[],
	binary?: string,
	sidecar?: string,
): Promise<void> {
	const packageRoot = fileURLToPath(new URL("..", import.meta.url));
	const binaryPath = binary ?? (await resolveBinaryPath(packageRoot));
	const sidecarPath = sidecar ?? resolve(packageRoot, "sidecar/sidecar.mjs");
	await new Promise<void>((resolveChild, reject) => {
		const child = spawn(
			binaryPath,
			[command, "--sidecar-path", sidecarPath, ...args],
			{
				stdio: "inherit",
			},
		);
		child.once("error", (error) =>
			reject(
				new Error(
					`Failed to spawn repopo-core: ${error.message}\nBinary path: ${binaryPath}`,
					{ cause: error },
				),
			),
		);
		child.once("close", (code) => {
			if (code !== 0) {
				process.exitCode = code ?? 1;
			}
			resolveChild();
		});
	});
}
