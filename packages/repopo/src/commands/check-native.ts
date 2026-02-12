import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, Flags } from "@oclif/core";
import { dirname, resolve } from "pathe";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Runs the Rust-based repopo-core engine with the Node.js sidecar for
 * policy handler execution. This command provides the same functionality
 * as `check` but uses the Rust engine for file enumeration, regex matching,
 * and orchestration.
 */
export class CheckNative extends Command {
	public static override readonly summary =
		"Checks and applies policies using the Rust engine.";

	public static override readonly description =
		"Runs the Rust-based repopo-core engine with the Node.js sidecar. " +
		"This provides the same policy checking as 'check' but with Rust-based " +
		"file enumeration, regex matching, and orchestration for better performance.";

	public static override readonly flags = {
		fix: Flags.boolean({
			aliases: ["resolve"],
			description: "Fix errors if possible.",
			required: false,
			char: "f",
		}),
		stdin: Flags.boolean({
			description: "Read list of files from stdin.",
			required: false,
		}),
		verbose: Flags.boolean({
			description: "Show verbose output including per-policy timing.",
			required: false,
			char: "v",
		}),
		quiet: Flags.boolean({
			description: "Suppress all output except errors.",
			required: false,
			char: "q",
		}),
		config: Flags.string({
			description: "Path to the config file.",
			required: false,
			char: "c",
		}),
		"sidecar-path": Flags.string({
			description: "Path to the Node.js sidecar script.",
			required: false,
			env: "REPOPO_SIDECAR_PATH",
		}),
		"binary-path": Flags.string({
			description: "Path to the repopo-core Rust binary.",
			required: false,
			env: "REPOPO_CORE_PATH",
		}),
	} as const;

	public override async run(): Promise<void> {
		const { flags } = await this.parse(CheckNative);

		const binaryPath = this.resolveBinaryPath(flags["binary-path"]);
		const sidecarPath = this.resolveSidecarPath(flags["sidecar-path"]);

		const args: string[] = ["check", "--sidecar-path", sidecarPath];

		if (flags.fix) {
			args.push("--fix");
		}
		if (flags.stdin) {
			args.push("--stdin");
		}
		if (flags.verbose) {
			args.push("--verbose");
		}
		if (flags.quiet) {
			args.push("--quiet");
		}
		if (flags.config) {
			args.push("--config", flags.config);
		}

		return new Promise<void>((resolvePromise, reject) => {
			const child = spawn(binaryPath, args, {
				stdio: "inherit",
				// biome-ignore lint/style/noProcessEnv: Need to pass parent environment to child process
				env: { ...process.env },
			});

			child.on("error", (err) => {
				reject(
					new Error(
						`Failed to spawn repopo-core: ${err.message}\n` +
							`Binary path: ${binaryPath}\n` +
							"Make sure the Rust binary has been built: cargo build --manifest-path crates/core/Cargo.toml",
					),
				);
			});

			child.on("close", (code) => {
				if (code !== 0) {
					process.exitCode = code ?? 1;
				}
				resolvePromise();
			});
		});
	}

	private resolveBinaryPath(explicit?: string): string {
		if (explicit) {
			return explicit;
		}

		// Look for the binary relative to the package root
		const packageRoot = resolve(__dirname, "..", "..");
		const cratesDir = resolve(packageRoot, "crates", "core", "target");

		// Prefer release build if it exists, fall back to debug
		const releasePath = resolve(cratesDir, "release", "repopo-core");
		if (existsSync(releasePath)) {
			return releasePath;
		}

		return resolve(cratesDir, "debug", "repopo-core");
	}

	private resolveSidecarPath(explicit?: string): string {
		if (explicit) {
			return explicit;
		}

		const packageRoot = resolve(__dirname, "..", "..");
		return resolve(packageRoot, "sidecar", "sidecar.mjs");
	}
}
