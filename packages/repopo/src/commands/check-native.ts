import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, Flags } from "@oclif/core";
import { dirname, resolve } from "pathe";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "../concurrency.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Runs the Rust-based repopo-core engine with the Node.js sidecar for
 * per-policy execution. Rust owns matching, ordering, concurrency, exception
 * boundaries, repository scheduling and aggregation.
 */
export class CheckNative extends Command {
	public static override readonly summary =
		"Checks and applies policies using the Rust engine.";

	public static override readonly description =
		"Runs the Rust-based repopo-core engine with the Node.js sidecar. " +
		"Rust handles file matching, scheduling and reporting; the sidecar shares per-policy contracts with 'check'. " +
		"Repository policies always run with the full repository inventory, including with --stdin. " +
		"With --fix, repository policies can modify files outside the stdin selection.";

	public static override readonly flags = {
		concurrency: Flags.integer({
			description:
				"Maximum concurrent files in read-only checks. Fixes remain sequential.",
			default: DEFAULT_CONCURRENCY,
			parse: async (value) => validateConcurrency(Number(value)),
		}),
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
		runtime: Flags.string({
			description: "JS runtime for the sidecar process (auto, node, bun).",
			required: false,
			env: "REPOPO_RUNTIME",
			options: ["auto", "node", "bun"],
		}),
	} as const;

	public override async run(): Promise<void> {
		const { flags } = await this.parse(CheckNative);

		const binaryPath = this.resolveBinaryPath(flags["binary-path"]);
		const sidecarPath = this.resolveSidecarPath(flags["sidecar-path"]);

		const args: string[] = ["check", "--sidecar-path", sidecarPath];
		args.push("--concurrency", String(flags.concurrency));

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
		if (flags.runtime) {
			args.push("--runtime", flags.runtime);
		}

		return new Promise<void>((resolvePromise, reject) => {
			const child = spawn(binaryPath, args, {
				stdio: "inherit",
				// biome-ignore lint/style/noProcessEnv: Need to pass parent environment to child process
				env: { ...process.env },
			});
			const interrupt = () => child.kill("SIGINT");
			const terminate = () => child.kill("SIGTERM");
			const cleanup = () => {
				process.removeListener("SIGINT", interrupt);
				process.removeListener("SIGTERM", terminate);
			};
			process.on("SIGINT", interrupt);
			process.on("SIGTERM", terminate);

			child.on("error", (err) => {
				cleanup();
				reject(
					new Error(
						`Failed to spawn repopo-core: ${err.message}\n` +
							`Binary path: ${binaryPath}\n` +
							"Make sure the Rust binary has been built: cargo build --manifest-path crates/core/Cargo.toml",
					),
				);
			});

			child.on("close", (code, signal) => {
				cleanup();
				if (code !== 0) {
					process.exitCode =
						code ??
						(signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1);
				}
				resolvePromise();
			});
		});
	}

	private resolveBinaryPath(explicit?: string): string {
		if (explicit) {
			return explicit;
		}

		const packageRoot = resolve(__dirname, "..", "..");
		const binaryName =
			process.platform === "win32" ? "repopo-core.exe" : "repopo-core";

		// Check paths in priority order:
		// 1. Postinstall-downloaded binary (npm install)
		const nativePath = resolve(packageRoot, "native", binaryName);
		if (existsSync(nativePath)) {
			return nativePath;
		}

		// 2. Local release build (cargo build --release)
		const releasePath = resolve(
			packageRoot,
			"crates",
			"core",
			"target",
			"release",
			binaryName,
		);
		if (existsSync(releasePath)) {
			return releasePath;
		}

		// 3. Local debug build (cargo build)
		const debugPath = resolve(
			packageRoot,
			"crates",
			"core",
			"target",
			"debug",
			binaryName,
		);
		if (existsSync(debugPath)) {
			return debugPath;
		}

		throw new Error(
			"repopo-core binary not found. Either:\n" +
				"  - Install the package (npm install repopo) to download pre-built binaries\n" +
				"  - Build from source: cargo build --manifest-path crates/core/Cargo.toml",
		);
	}

	private resolveSidecarPath(explicit?: string): string {
		if (explicit) {
			return explicit;
		}

		const packageRoot = resolve(__dirname, "..", "..");
		return resolve(packageRoot, "sidecar", "sidecar.mjs");
	}
}
