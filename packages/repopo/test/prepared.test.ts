import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultPolicies } from "../src/policy.js";

const { fingerprint, prepareBundle } = await import(
	new URL("../sidecar/prepare.mjs", import.meta.url).href
);

describe("compile-only policy preparation", () => {
	let root: string;
	let config: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-prepare-"));
		config = join(root, "repopo.config.mjs");
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it("does not initialize config modules or run handlers, including unsupported configs", async () => {
		const marker = join(root, "executed");
		await writeFile(
			config,
			`
			import { writeFileSync } from "node:fs";
			writeFileSync(${JSON.stringify(marker)}, "config");
			export default { policies: [{
				name: "SideEffect", description: "", match: /./,
				handler: () => { throw new Error("handler executed"); },
				resolver: () => { throw new Error("resolver executed"); }
			}] };
		`,
		);
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
		await writeFile(
			config,
			`
			import { execFileSync } from "node:child_process";
			execFileSync("should-not-run");
			throw new Error("config executed");
			export default { policies: [] };
		`,
		);
		const unsupported = await prepareBundle(root);
		expect(unsupported.reasons).toContainEqual(
			expect.objectContaining({ module: "node:child_process" }),
		);
	});

	it.each([
		"default",
		"exclusions",
		"empty",
		"commonjs",
	])("resolves %s config metadata only when evaluated", async (kind) => {
		const sources = new Map([
			[
				"commonjs",
				'module.exports = { policies: [], excludeFiles: ["vendor/"] };',
			],
			["empty", 'export default { policies: [], excludeFiles: ["vendor/"] };'],
			["exclusions", 'export default { excludeFiles: ["vendor/"] };'],
		]);
		config = join(
			root,
			kind === "commonjs" ? "repopo.config.cjs" : "repopo.config.mjs",
		);
		const source = sources.get(kind);
		if (source !== undefined) {
			await writeFile(config, source);
		}
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		expect(artifact).not.toHaveProperty("policies");
		const globals: Record<string, unknown> = { process, Buffer, URL };
		runInNewContext(artifact.bundle, globals);
		expect(typeof globals.__repopo_metadata).toBe("string");
		const metadata = JSON.parse(String(globals.__repopo_metadata));
		expect(
			metadata.policies.map((policy: { name: string }) => policy.name),
		).toEqual(
			["empty", "commonjs"].includes(kind)
				? []
				: DefaultPolicies.map(({ name }) => name),
		);
		expect(metadata.excludeFiles).toEqual(
			kind === "default" ? [] : ["vendor/"],
		);
	});

	it.each([
		"const name = process.env.MODULE; const value = await import(name); export default value;",
		"const name = process.env.MODULE; module.exports = require(name);",
		"process.exit(0); module.exports = { policies: [] };",
		'console.time("work"); module.exports = { policies: [] };',
		'console.log("%j", {}); module.exports = { policies: [] };',
		'Buffer.from("data", "base64"); module.exports = { policies: [] };',
		'const path = require("node:path"); path.win32.resolve("C:\\\\data"); module.exports = { policies: [] };',
	])("selects IPC before runtime module loading or unsupported process APIs: %s", async (source) => {
		config = join(root, "repopo.config.cjs");
		await writeFile(config, source);
		// Dynamic import syntax remains valid without top-level await in CJS.
		if (source.includes("await import")) {
			config = join(root, "repopo.config.mjs");
			await writeFile(
				config,
				"export default { policies: [], loader: name => import(name) };",
			);
		}
		const artifact = await prepareBundle(root, config);
		expect(artifact.reasons.length).toBeGreaterThan(0);
	});

	it("preserves POSIX backslashes and console return values in supported adapters", async () => {
		await writeFile(
			config,
			`
			import path from "node:path";
			const name = path.basename("directory/file\\\\name");
			const formatted = path.format({ dir: "/tmp", name: "file", ext: "txt" });
			const returned = console.log("prepared", name);
			export default { policies: [], excludeFiles: [name, formatted, String(returned)] };
		`,
		);
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		const writes: string[] = [];
		const globals: Record<string, unknown> = {
			process: {
				...process,
				stdout: {
					write: (value: string) => {
						writes.push(value);
						return true;
					},
				},
			},
			Buffer,
			URL,
			console: undefined,
		};
		runInNewContext(artifact.bundle, globals);
		expect(JSON.parse(String(globals.__repopo_metadata)).excludeFiles).toEqual([
			"file\\name",
			"/tmp/file.txt",
			"undefined",
		]);
		expect(writes).toEqual(["prepared file\\name\n"]);
	});

	it("classifies top-level await as IPC-only without evaluating the config", async () => {
		await writeFile(
			config,
			`
			await Promise.resolve();
			throw new Error("config must not run during preparation");
			export default { policies: [] };
		`,
		);
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toContainEqual(
			expect.objectContaining({
				reason: expect.stringContaining("Top-level await"),
			}),
		);
	});

	it("does not turn failed assertions into successful policy code", async () => {
		await writeFile(
			config,
			`
			import assert from "node:assert/strict";
			assert.strictEqual(NaN, NaN);
			let failures = 0;
			for (const check of [
				() => assert.equal("1", 1),
				() => assert.strictEqual(-0, 0),
				() => assert.throws(() => {}),
			]) {
				try { check(); } catch { failures++; }
			}
			export default { policies: [], excludeFiles: [String(failures)] };
		`,
		);
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		const globals: Record<string, unknown> = { process, Buffer, URL };
		runInNewContext(artifact.bundle, globals);
		expect(JSON.parse(String(globals.__repopo_metadata)).excludeFiles).toEqual([
			"3",
		]);
	});

	it.each([
		"export default { policies: [ };",
		'import missing from "./missing-policy.mjs"; export default missing;',
		'import { exec } from "node:child_process"; import missing from "./missing.mjs"; export default { exec, missing };',
	])("does not turn invalid or unresolved ordinary code into fallback", async (source) => {
		await writeFile(config, source);
		await expect(prepareBundle(root)).rejects.toThrow();
	});

	it("tracks static require.resolve, source changes, and resolution-changing additions", async () => {
		config = join(root, "repopo.config.cjs");
		const helper = join(root, "helper.cjs");
		await writeFile(helper, "module.exports = 1;");
		await writeFile(
			config,
			'module.exports = { policies: [], path: require.resolve("./helper.cjs") };',
		);
		const artifact = await prepareBundle(root, config);
		expect(artifact.reasons).toEqual([]);
		expect(artifact.bundle).not.toContain('__require.resolve("./helper.cjs")');
		const input = artifact.inputs.find(
			(entry: { path: string }) => entry.path === helper,
		);
		expect(input).toMatchObject({ kind: "file" });
		await writeFile(helper, "module.exports = 2;");
		expect(await fingerprint(helper)).not.toEqual(input);
		const guard = artifact.inputs.find(
			(entry: { path: string }) => entry.path === root,
		);
		await writeFile(join(root, "helper.ts"), "export default 3;");
		expect(await fingerprint(root)).not.toEqual(guard);
	});

	it("tracks JSONC tsconfig extensions, aliases, compiler code, and bridge inputs", async () => {
		await mkdir(join(root, "lib"));
		const base = join(root, "base.json");
		const helper = join(root, "lib/policy.ts");
		await writeFile(
			base,
			'{ /* shared aliases */ "compilerOptions": { "baseUrl": ".", "paths": { "@policy/*": ["lib/*"] } }, }',
		);
		await writeFile(
			join(root, "tsconfig.json"),
			'{ "extends": "./base.json", }',
		);
		await writeFile(helper, "export const policies = [];");
		config = join(root, "repopo.config.ts");
		await writeFile(
			config,
			'import { policies } from "@policy/policy"; export default { policies };',
		);
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		const paths = artifact.inputs.map((entry: { path: string }) => entry.path);
		expect(paths).toEqual(
			expect.arrayContaining([
				base,
				helper,
				config,
				fileURLToPath(new URL("../sidecar/prepare.mjs", import.meta.url)),
				fileURLToPath(
					new URL("../sidecar/shims/quickjs-bridge.mjs", import.meta.url),
				),
			]),
		);
		expect(
			paths.some(
				(path: string) =>
					path.includes("/esbuild/") && path.endsWith("/bin/esbuild"),
			),
		).toBe(true);
		await writeFile(base, '{ "compilerOptions": {} }');
		expect(await fingerprint(base)).not.toEqual(
			artifact.inputs.find((entry: { path: string }) => entry.path === base),
		);
	});

	it("tracks package tsconfig defaults and transitive extensions without a Node main entry", async () => {
		const packageRoot = join(root, "node_modules/shared-tsconfig");
		await mkdir(packageRoot, { recursive: true });
		await writeFile(
			join(packageRoot, "package.json"),
			'{"name":"shared-tsconfig"}',
		);
		const base = join(packageRoot, "tsconfig.json");
		const inherited = join(packageRoot, "base.json");
		await writeFile(base, '{"extends":"./base.json"}');
		await writeFile(inherited, '{"compilerOptions":{"strict":true}}');
		await writeFile(
			join(root, "tsconfig.json"),
			'{"extends":"shared-tsconfig"}',
		);
		await writeFile(config, "export default { policies: [] };");
		const artifact = await prepareBundle(root);
		expect(artifact.reasons).toEqual([]);
		for (const path of [base, inherited]) {
			const before = artifact.inputs.find(
				(entry: { path: string }) => entry.path === path,
			);
			expect(before).toMatchObject({ kind: "file" });
			await writeFile(path, '{"compilerOptions":{}}');
			expect(await fingerprint(path)).not.toEqual(before);
		}
	});

	it.skipIf(process.platform === "win32")(
		"records lexical package symlink targets, not only resolved source files",
		async () => {
			const first = join(root, "first");
			const second = join(root, "second");
			for (const path of [first, second]) {
				await mkdir(path);
				await writeFile(
					join(path, "package.json"),
					'{"name":"dependency","main":"index.mjs"}',
				);
				await writeFile(join(path, "index.mjs"), "export default [];");
			}
			await mkdir(join(root, "node_modules"));
			const link = join(root, "node_modules/dependency");
			await symlink(first, link, "dir");
			await writeFile(
				config,
				'import policies from "dependency"; export default { policies };',
			);
			const artifact = await prepareBundle(root);
			const guard = artifact.inputs.find(
				(entry: { path: string }) => entry.path === link,
			);
			expect(guard).toMatchObject({ realPath: first });
			await rm(link);
			await symlink(second, link, "dir");
			expect(await fingerprint(link)).not.toEqual(guard);
			expect(await readFile(join(second, "index.mjs"), "utf8")).toBe(
				"export default [];",
			);
		},
	);
});
