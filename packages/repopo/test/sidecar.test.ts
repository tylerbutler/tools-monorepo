import { execFile, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { join, resolve } from "pathe";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultPolicies } from "../src/policy.js";
import type { PolicyRunResults } from "../src/runner.js";

const sidecarPath = fileURLToPath(
	new URL("../sidecar/sidecar.mjs", import.meta.url),
);
const factoryUrl = new URL("../esm/makePolicy.js", import.meta.url).href;
const binaryPath = fileURLToPath(
	new URL("../crates/core/target/debug/repopo-core", import.meta.url),
);
const cliPath = fileURLToPath(new URL("../bin/run.js", import.meta.url));
const binaryExists = await access(binaryPath).then(
	() => true,
	() => false,
);

interface WireResults extends Omit<PolicyRunResults, "perfStats"> {
	perfStats: {
		count: number;
		processed: number;
		data: Record<string, Record<string, number>>;
	};
}
interface Response {
	ok: boolean;
	data?: WireResults;
	error?: string;
}

async function runSidecar(requests: object[]): Promise<Response[]> {
	const stdout = await new Promise<string>((resolvePromise, reject) => {
		const child = execFile(
			process.execPath,
			[sidecarPath],
			{ timeout: 15000, maxBuffer: 8 * 1024 * 1024 },
			(error, output, stderr) => {
				if (error) {
					reject(new Error(`Sidecar failed: ${stderr}`, { cause: error }));
				} else {
					resolvePromise(output);
				}
			},
		);
		// Keep the request pipe open: EOF is cancellation, shutdown is graceful.
		child.stdin?.write(
			`${[...requests, { method: "shutdown" }]
				.map((request) => JSON.stringify(request))
				.join("\n")}\n`,
		);
	});
	return stdout
		.trim()
		.split("\n")
		.map((line): Response => JSON.parse(line));
}

describe("Native canonical sidecar", () => {
	let testDir: string;
	let configPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(resolve(".repopo-native-fixture-"));
		configPath = join(testDir, "repopo.config.mjs");
		await simpleGit(testDir).init();
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	const configSource = (policies: string, excludeFiles = "[]") =>
		`import { makePolicy } from ${JSON.stringify(factoryUrl)};
		export default { policies: ${policies}, excludeFiles: ${excludeFiles} };`;

	async function execute(
		source: string,
		params: { files?: string[]; fix?: boolean; concurrency?: unknown } = {},
	): Promise<WireResults> {
		await writeFile(configPath, source);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method: "run_policies", params: { files: [], ...params } },
		]);
		if (!(responses[0]?.ok && responses[1]?.ok && responses[1].data)) {
			throw new Error(`Sidecar request failed: ${JSON.stringify(responses)}`);
		}
		return responses[1].data;
	}

	it("registers canonical factory defaults, identities and per-instance exclusions", async () => {
		const result = await execute(
			configSource(`["first","second"].map(instanceId => makePolicy({
				name:"Same",description:"configured",match:/(?<=^)a\\.txt$/g,
				requiresConfig:true,defaultConfig:{message:"default"},
				handler:async ({config}) => [{message:config.message}]
			}, {instanceId, exclude: instanceId === "first" ? [/^a/] : [],
				config: instanceId === "second" ? {message:"explicit"} : undefined}))`),
			{ files: ["a.txt", "a.txt"] },
		);
		expect(result.findings).toEqual(
			[0, 1].map(() => ({
				policy: "Same",
				policyId: "second",
				scope: "file",
				file: "a.txt",
				message: "explicit",
			})),
		);
		expect(result.skipped).toHaveLength(2);
		expect(result.perfStats).toMatchObject({
			count: 2,
			processed: 2,
			data: { handle: { second: expect.any(Number) } },
		});
	});

	it.each([
		`[{name:"Required",description:"required",match:/./,requiresConfig:true,handler:async()=>[]}]`,
		`[0,1].map(() => ({name:"Duplicate",description:"duplicate",match:/./,handler:async()=>[]}))`,
		`["a","b"].map(name => ({name,instanceId:"same",description:"collision",match:/./,handler:async()=>[]}))`,
		`[{name:"Repo",description:"resolver",scope:"repository",handler:async()=>[],resolver:async()=>[]}]`,
		`[makePolicy({name:"Old",description:"alias",match:/./,handler:async()=>[]}, {excludeFiles:[]})]`,
		`[{name:"Old",description:"alias",match:/./,excludeFiles:[],handler:async()=>[]}]`,
	])("rejects invalid registration before any work: %s", async (policies) => {
		await writeFile(configPath, configSource(policies));
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method: "run_policies", params: { files: ["a.txt"] } },
		]);
		expect(responses[0]).toMatchObject({
			ok: false,
			error: expect.any(String),
		});
		expect(responses[1]).toMatchObject({
			ok: false,
			error: expect.stringContaining("Load configuration"),
		});
	});

	it.each([
		"true",
		"undefined",
		"null",
		"({message:'bare'})",
		"[{error:'retired'}]",
		"[{message:'old',fixed:true}]",
		"[{message:'old',fixable:true}]",
		"[{message:'old',resolved:true}]",
		"[{message:'old',autoFixable:true}]",
		"[{message:'old',errorMessages:[]}]",
		"[{message:'bad',files:undefined}]",
		"[{message:'bad',files:['a.txt']}]",
		"[{message:'bad',manualFix:42}]",
		"[{message:'bad',fixStatus:'resolved'}]",
		"[{message:'bad',fixStatus:'fixed'}]",
		"[{message:'bad',fixStatus:'failed'}]",
		"[{message:''}]",
		"[{message:'bad',[Symbol('hidden')]:true}]",
	])("collects contract errors for malformed read-only output: %s", async (value) => {
		const result = await execute(
			configSource(`[{
			name:"Malformed",description:"malformed",match:/./,
			handler:async()=>${value}
		},{
			name:"Independent",description:"continue",match:/./,
			handler:async()=>[{message:"still checked"}]
		}]`),
			{ files: ["a.txt"] },
		);
		expect(result.errors).toMatchObject([
			{
				policyId: "Malformed",
				scope: "file",
				file: "a.txt",
				phase: "handle",
				kind: "contract",
				cause: { name: "TypeError", message: expect.any(String) },
			},
		]);
		expect(result.findings).toMatchObject([{ message: "still checked" }]);
		expect(result.skipped).toEqual([]);
	});

	it.each([
		"/absolute",
		"../outside",
		"a//b",
		"a\\\\b",
		"C:drive",
		"a/./b",
		"a\\0b",
	])("rejects malformed repository locations: %s", async (file) => {
		const result = await execute(
			configSource(`[{
				name:"Locations",description:"locations",scope:"repository",
				handler:async()=>[{message:"bad",files:[${JSON.stringify(file.replace("\\0", "\0"))}]}]
			}]`),
		);
		expect(result.errors).toMatchObject([
			{ kind: "contract", scope: "repository" },
		]);
		// Git inventory includes the config, even though file selection is empty.
		expect(result.errors[0]?.files).toEqual(["repopo.config.mjs"]);
	});

	it("preserves independent fixed and unresolved findings and suppresses inline failed resolvers", async () => {
		const result = await execute(
			configSource(`[{
			name:"Inline",description:"inline",match:/./,
			handler:async()=>[
				{message:"fixed",fixStatus:"fixed"},
				{message:"failed",fixStatus:"failed",manualFix:"Do this.\\nThen that."},
				{message:"unresolved"}
			],
			resolver:async()=>{throw new Error("must not run")}
		},{
			name:"Following",description:"ordinary failure does not stop",match:/./,
			handler:async()=>[{message:"following"}]
		}]`),
			{ files: ["a.txt"], fix: true },
		);
		expect(result.findings.map(({ message }) => message)).toEqual([
			"fixed",
			"failed",
			"unresolved",
			"following",
		]);
		expect(result.findings[1]?.manualFix).toBe("Do this.\nThen that.");
		expect(result.errors).toEqual([]);
		expect(result.skipped).toEqual([]);
		expect(result.perfStats.data.resolve).toBeUndefined();
	});

	it.each([
		"fixed",
		"failed",
	])("independently suppresses the resolver for inline %s", async (fixStatus) => {
		const result = await execute(
			configSource(`[{
					name:"Inline",description:"inline attempt",match:/./,
					handler:async()=>[{message:"attempted",fixStatus:${JSON.stringify(fixStatus)}},{message:"unresolved"}],
					resolver:async()=>{throw new Error("must not run")}
				}]`),
			{ files: ["a.txt"], fix: true },
		);
		expect(result.findings).toMatchObject([
			{ message: "attempted", fixStatus },
			{ message: "unresolved" },
		]);
		expect(result.errors).toEqual([]);
		expect(result.perfStats.data.resolve).toBeUndefined();
	});

	it.each([
		"true",
		"[{message:'invalid',files:['a.txt']}]",
	])("classifies malformed resolver output and retains checked findings: %s", async (value) => {
		const result = await execute(
			configSource(`[{
					name:"Resolver",description:"contract",match:/./,
					handler:async()=>[{message:"original",manualFix:"Keep this"}],
					resolver:async()=>${value}
				},{
					name:"Following",description:"skipped",match:/./,handler:async()=>[]
				}]`),
			{ files: ["a.txt"], fix: true },
		);
		expect(result.findings).toMatchObject([
			{ message: "original", manualFix: "Keep this" },
		]);
		expect(result.errors).toMatchObject([
			{ kind: "contract", phase: "resolve", file: "a.txt" },
		]);
		expect(result.skipped).toMatchObject([
			{ policyId: "Following", reason: "file-fix-error" },
		]);
	});

	it("flushes large canonical responses before shutdown without flattening messages", async () => {
		const result = await execute(
			configSource(`[{
				name:"Many",description:"large response",scope:"repository",
				handler:async()=>Array.from({length:4000},(_,index)=>({
					message:"independent "+index,
					manualFix:"Use the shared helper. ".repeat(5)
				}))
			}]`),
		);
		expect(result.findings).toHaveLength(4000);
		expect(result.findings[3999]).toMatchObject({
			message: "independent 3999",
			manualFix: "Use the shared helper. ".repeat(5),
		});
	});

	it("reconciles resolver arrays without blanket resolution, losing guidance or omitted findings", async () => {
		const result = await execute(
			configSource(`[{
			name:"Partial",description:"partial",match:/./,
			handler:async()=>[
				{message:"one",manualFix:"Keep guidance",fixStatus:"available"},
				{message:"two",manualFix:"Still unresolved"}
			],
			resolver:async({findings})=>[{message:findings[0].message,fixStatus:"fixed"}]
		},{
			name:"Empty",description:"empty",match:/./,
			handler:async()=>[{message:"not resolved",manualFix:"Still needed"}],
			resolver:async()=>[]
		}]`),
			{ files: ["a.txt"], fix: true },
		);
		expect(result.findings).toMatchObject([
			{ message: "one", fixStatus: "fixed", manualFix: "Keep guidance" },
			{ message: "two", manualFix: "Still unresolved" },
			{ message: "not resolved", manualFix: "Still needed" },
		]);
		expect(result.errors).toEqual([]);
	});

	it.each([
		"handle",
		"resolve",
	])("enforces file fix %s exception boundaries, retains causes and does not roll back", async (phase) => {
		const result = await execute(
			`
			import {writeFile} from "node:fs/promises";
			export default {policies:[{
				name:"First",description:"fails one file",match:/txt$/,
				handler:async({file,root})=>{
					if (${JSON.stringify(phase)} === "handle" && file === "a.txt") {
						await writeFile(root+"/effect.txt","retained");
						throw new Error("broken",{cause:{code:"EIO"}});
					}
					return [{message:"checked",manualFix:"Retain checked guidance"}];
				},
				resolver:async({file,root,findings})=>{
					if (${JSON.stringify(phase)} === "resolve" && file === "a.txt") {
						await writeFile(root+"/effect.txt","retained");
						findings[0].message="mutated";
						throw new Error("broken",{cause:{code:"EIO"}});
					}
					return [];
				}
			},{
				name:"Following",description:"follows",match:/txt$/,
				handler:async()=>[{message:"following"}]
			},{
				name:"Repo",description:"must skip",scope:"repository",
				handler:async()=>{throw new Error("must not run")}
			}]};`,
			{ files: ["a.txt", "b.txt"], fix: true },
		);
		expect(result.errors).toMatchObject([
			{
				policyId: "First",
				phase,
				kind: "exception",
				scope: "file",
				file: "a.txt",
				cause: { name: "Error", message: "broken", cause: { code: "EIO" } },
			},
		]);
		expect(result.skipped).toEqual([
			{
				policy: "Following",
				policyId: "Following",
				scope: "file",
				file: "a.txt",
				reason: "file-fix-error",
			},
			{
				policy: "Repo",
				policyId: "Repo",
				scope: "repository",
				reason: "file-fix-error",
			},
		]);
		expect(
			result.findings.filter(({ policyId }) => policyId === "Following"),
		).toMatchObject([{ file: "b.txt" }]);
		if (phase === "resolve") {
			expect(result.findings[0]).toMatchObject({
				message: "checked",
				manualFix: "Retain checked guidance",
			});
		}
		expect(await readFile(join(testDir, "effect.txt"), "utf8")).toBe(
			"retained",
		);
		expect(result.perfStats.data[phase]?.First).toEqual(expect.any(Number));
	});

	it.each([
		false,
		true,
	])("handles repository exceptions with fix=%s", async (fix) => {
		const result = await execute(
			configSource(`[{
			name:"Broken",description:"throws",scope:"repository",
			handler:async()=>{throw new Error("repo failure")}
		},{
			name:"Following",description:"follows",scope:"repository",
			handler:async()=>[{message:"following"}]
		}]`),
			{ fix },
		);
		expect(result.errors).toMatchObject([
			{ scope: "repository", files: ["repopo.config.mjs"], kind: "exception" },
		]);
		expect(result.findings).toHaveLength(fix ? 0 : 1);
		expect(result.skipped).toEqual(
			fix
				? [
						{
							policy: "Following",
							policyId: "Following",
							scope: "repository",
							reason: "repository-fix-error",
						},
					]
				: [],
		);
	});

	it.each([
		1,
		3,
		undefined,
	])("bounds read-only file concurrency at %s and preserves file/policy order", async (concurrency) => {
		const limit = concurrency ?? 8;
		const source = `let active=0,peak=0,started=0,release;
			const gate=new Promise(resolve=>{release=resolve});
			export default {policies:[{
				name:"Bounded",description:"concurrency",match:/txt$/,
				handler:async({file})=>{
					active++;started++;peak=Math.max(peak,active);
					if(started===${limit})release();
					await gate;await Promise.resolve();active--;
					return [{message:"peak="+peak}];
				}
			},{
				name:"Following",description:"ordered",match:/txt$/,
				handler:async()=>[{message:"second"}]
			}]};`;
		const files = Array.from({ length: 17 }, (_, index) => `${index}.txt`);
		const result = await execute(source, { files, concurrency });
		expect(result.findings).toMatchObject(
			files.flatMap((file) => [
				{ file, policyId: "Bounded", message: `peak=${limit}` },
				{ file, policyId: "Following", message: "second" },
			]),
		);
	});

	it("preserves read-only exception ordering and continues repository work", async () => {
		const result = await execute(
			configSource(`[{
			name:"Broken",description:"throws",match:/txt$/,
			handler:async({file})=>{throw {message:file,code:"BROKEN",value:10n}}
		},{
			name:"Following",description:"continues",match:/txt$/,handler:async()=>[]
		},{
			name:"Repo",description:"continues",scope:"repository",handler:async()=>[{message:"repo ran"}]
		}]`),
			{ files: ["a.txt", "b.txt"], concurrency: 2 },
		);
		expect(result.errors.map(({ file }) => file)).toEqual(["a.txt", "b.txt"]);
		expect(result.errors[0]?.cause).toEqual({
			message: "a.txt",
			code: "BROKEN",
			value: { type: "bigint", value: "10" },
		});
		expect(result.findings).toMatchObject([
			{ policyId: "Repo", message: "repo ran" },
		]);
		expect(result.skipped).toEqual([]);
	});

	it.each([
		0,
		-1,
		1.5,
		"invalid",
		9007199254740992,
	])("rejects IPC concurrency %s", async (concurrency) => {
		await writeFile(configPath, configSource("[]"));
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method: "run_policies", params: { files: [], concurrency } },
		]);
		expect(responses[1]).toMatchObject({
			ok: false,
			error: expect.stringContaining("positive safe integer"),
		});
	});

	it("shares parsed snapshots within a check run, isolates mutations, and reads fresh during fixes", async () => {
		const helperUrl = new URL(
			"../esm/policyDefiners/definePackagePolicy.js",
			import.meta.url,
		).href;
		await writeFile(join(testDir, "package.json"), '{"nested":{"value":1}}');
		await writeFile(
			configPath,
			`
			import {writeFile} from "node:fs/promises";
			import {definePackagePolicy} from ${JSON.stringify(helperUrl)};
			export default {policies:[0,1].map(index=>definePackagePolicy({
				name:"JSON"+index,description:"cached snapshot",
				handler:async (json,{root,file})=>{
					const value=json.nested.value;json.nested.value=99;
					if(index===0)await writeFile(root+"/"+file,JSON.stringify({nested:{value:value+1}}));
					return [{message:"value="+value}];
				}
			}))};`,
		);
		const runRequest = (fix: boolean) => ({
			method: "run_policies",
			params: { files: ["package.json"], fix },
		});
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			runRequest(false),
			runRequest(false),
			runRequest(true),
		]);
		for (const [index, values] of [
			[1, [1, 1]],
			[2, [2, 2]],
			[3, [3, 4]],
		] as const) {
			expect(
				responses[index]?.data?.findings.map(({ message }) => message),
			).toEqual(values.map((value) => `value=${value}`));
		}
	});

	it("uses full eligible inventory with empty selection, preserving exclusion flags and JS regex semantics", async () => {
		for (const file of [
			"readme.md",
			"README.md",
			"prefix\nskip",
			"VENDOR.txt",
			"keep.txt",
			"OTHER.txt",
		]) {
			await writeFile(join(testDir, file), file);
		}
		const result = await execute(
			configSource(
				`[makePolicy({
			name:"Repository",description:"inventory",scope:"repository",
			handler:async({files})=>[{message:JSON.stringify(files),files}]
		},{exclude:[/^OTHER/]}),{
			name:"Unselected",description:"no selection",match:/./,
			handler:async()=>{throw new Error("must not run")}
		}]`,
				`[/^README/, /^skip$/m, "vendor"]`,
			),
		);
		expect(result.findings).toMatchObject([
			{
				scope: "repository",
				files: ["keep.txt", "readme.md", "repopo.config.mjs"],
				message: JSON.stringify(["keep.txt", "readme.md", "repopo.config.mjs"]),
			},
		]);
		expect(result.errors).toEqual([]);
		expect(result.perfStats).toMatchObject({ count: 0, processed: 0 });
	});

	it("invokes repository policies even when the eligible inventory is empty", async () => {
		const result = await execute(
			configSource(
				`[{
			name:"Empty",description:"empty",scope:"repository",
			handler:async({files})=>[{message:"length="+files.length}]
		}]`,
				`[".*"]`,
			),
		);
		expect(result.findings).toMatchObject([
			{ scope: "repository", message: "length=0" },
		]);
	});

	it("refreshes Git inventory after file fixes and between repository fixers", async () => {
		await writeFile(join(testDir, "removed.txt"), "old");
		await simpleGit(testDir).add("removed.txt");
		const result = await execute(
			`
			import {writeFile,rm} from "node:fs/promises";
			export default {policies:[{
				name:"File",description:"creates",match:/selected/,
				handler:async({root})=>{
					await writeFile(root+"/created.txt","new");
					await rm(root+"/removed.txt");
					return [{message:"created",fixStatus:"fixed"}];
				}
			},{
				name:"FirstRepo",description:"refresh",scope:"repository",
				handler:async({root,files})=>{
					await rm(root+"/created.txt");
					await writeFile(root+"/repository.txt","new");
					return [{message:JSON.stringify(files),fixStatus:"fixed"}];
				}
			},{
				name:"SecondRepo",description:"refresh again",scope:"repository",
				handler:async({files})=>[{message:JSON.stringify(files)}]
			}]};`,
			{ files: ["selected.txt"], fix: true },
		);
		expect(result.findings).toMatchObject([
			{ policyId: "File", fixStatus: "fixed" },
			{
				policyId: "FirstRepo",
				message: JSON.stringify(["created.txt", "repopo.config.mjs"]),
			},
			{
				policyId: "SecondRepo",
				message: JSON.stringify(["repopo.config.mjs", "repository.txt"]),
			},
		]);
	});

	it("keeps fixes sequential and preserves Effection generator teardown", async () => {
		const result = await execute(
			`
			import {sleep} from ${JSON.stringify(import.meta.resolve("effection"))};
			let active=0,peak=0,closed=0;
			export default {policies:[{
				name:"Generator",description:"structured lifetime",match:/./,
				handler:function*(){
					active++;peak=Math.max(peak,active);
					try {yield* sleep(1);return [{message:"peak="+peak+";closed="+closed,fixStatus:"fixed"}];}
					finally{active--;closed++;}
				}
			}]};`,
			{ files: ["a.txt", "b.txt", "c.txt"], fix: true, concurrency: 8 },
		);
		expect(result.findings.map(({ message }) => message)).toEqual([
			"peak=1;closed=0",
			"peak=1;closed=1",
			"peak=1;closed=2",
		]);
		expect(result.errors).toEqual([]);
	});

	it.each([
		"SIGTERM",
		"EOF",
	] as const)("cancels owned generators on %s without emitting an execution error", async (signal) => {
		await writeFile(
			configPath,
			`
			import {call,sleep} from ${JSON.stringify(import.meta.resolve("effection"))};
			import {writeFile} from "node:fs/promises";
			export default {policies:[{
				name:"Cancellable",description:"owned operation",match:/./,
				handler:function*({root}){
					try{
						yield* call(()=>writeFile(root+"/started","started"));
						yield* sleep(60000);
						return [];
					}finally{yield* call(()=>writeFile(root+"/closed","closed"));}
				}
			}]};`,
		);
		const child = spawn(process.execPath, [sidecarPath], {
			stdio: ["pipe", "pipe", "pipe"],
		});
		let output = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			output += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		const closed = new Promise<number | null>((resolvePromise) =>
			child.on("close", resolvePromise),
		);
		try {
			const loaded = new Promise<void>((resolvePromise) => {
				const lines = createInterface({ input: child.stdout });
				lines.once("line", () => {
					lines.close();
					resolvePromise();
				});
			});
			child.stdin.write(
				`${JSON.stringify({ method: "load_config", params: { configPath, gitRoot: testDir } })}\n`,
			);
			await loaded;
			child.stdin.write(
				`${JSON.stringify({ method: "run_policies", params: { files: ["a.txt"] } })}\n`,
			);
			await expect
				.poll(() =>
					access(join(testDir, "started")).then(
						() => true,
						() => false,
					),
				)
				.toBe(true);
			if (signal === "EOF") {
				child.stdin.end();
			} else {
				child.kill(signal);
			}
			expect(await closed, stderr).toBe(130);
			expect(await readFile(join(testDir, "closed"), "utf8")).toBe("closed");
			expect(output.trim().split("\n")).toHaveLength(1);
			expect(output).not.toContain("execution");
		} finally {
			if (child.exitCode === null) {
				child.kill("SIGKILL");
			}
		}
	});

	it.each([
		undefined,
		"[]",
	])("retains default versus explicitly disabled policies: %s", async (policies) => {
		await writeFile(
			configPath,
			`export default {excludeFiles:["vendor/"]${policies ? `,policies:${policies}` : ""}};`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
		]);
		expect(responses[0]).toMatchObject({
			ok: true,
			data: {
				policies: policies
					? []
					: DefaultPolicies.map(({ name }) =>
							expect.objectContaining({ name }),
						),
				excludeFiles: ["vendor/"],
			},
		});
	});

	describe.skipIf(!binaryExists)(
		"controlled actual check/check-native CLI",
		() => {
			async function cli(
				command: "check" | "check-native",
				fix: boolean,
				stdin = "",
			) {
				return new Promise<{ code: number; output: string }>(
					(resolvePromise, reject) => {
						const child = execFile(
							process.execPath,
							[
								cliPath,
								command,
								"--stdin",
								"--config",
								configPath,
								...(fix ? ["--fix"] : []),
								...(command === "check-native"
									? [
											"--binary-path",
											binaryPath,
											"--sidecar-path",
											sidecarPath,
											"--runtime",
											"node",
										]
									: []),
							],
							{ cwd: testDir, timeout: 15000 },
							(error, stdout, stderr) => {
								if (error && typeof error.code !== "number") {
									reject(error);
								} else {
									resolvePromise({
										code: error?.code ?? 0,
										output: stdout + stderr,
									});
								}
							},
						);
						child.stdin?.end(stdin);
					},
				);
			}

			it.each([
				"check",
				"check-native",
			] as const)("shows fixed findings, unresolved guidance, full inventory and nonzero exit: %s", async (command) => {
				await writeFile(join(testDir, "unchanged.txt"), "unchanged");
				await writeFile(
					configPath,
					configSource(`[makePolicy({
				name:"Repo",description:"canonical",scope:"repository",
				handler:async({files,resolve})=>[
					{message:"inventory="+JSON.stringify(files),...(resolve?{fixStatus:"fixed"}:{})},
					{message:"unresolved",manualFix:"Use the shared helper.\\nPreserve error handling."}
				]
			},{instanceId:"repo-instance"})]`),
				);
				const result = await cli(command, true);
				expect(result.code).toBe(1);
				expect(result.output).toContain("Resolved repo-instance:");
				expect(result.output).toContain("unchanged.txt");
				expect(result.output).toContain("unresolved");
				expect(result.output).toContain("Use the shared helper.");
				expect(result.output).toContain("Preserve error handling.");
			});

			it.each([
				"check",
				"check-native",
			] as const)("exits successfully with only fixed findings: %s", async (command) => {
				await writeFile(
					configPath,
					configSource(`[{
				name:"Fixed",description:"fixed",match:/txt$/,
				handler:async()=>[{message:"changed",fixStatus:"fixed"}]
			}]`),
				);
				const result = await cli(command, true, "selected.txt\n");
				expect(result.code).toBe(0);
				expect(result.output).toContain(
					"Resolved Fixed: selected.txt: changed",
				);
			});

			it.each([
				"check",
				"check-native",
			] as const)("fails for structured errors, continues other files and skips repository fixes: %s", async (command) => {
				await writeFile(
					configPath,
					configSource(`[{
				name:"Broken",description:"error",match:/txt$/,
				handler:async({file})=>{if(file==="a.txt")throw new Error("fixture failure");return []}
			},{
				name:"Following",description:"follows",match:/txt$/,
				handler:async()=>[{message:"independent",fixStatus:"fixed"}]
			},{
				name:"Repo",description:"must skip",scope:"repository",
				handler:async()=>{throw new Error("must not run")}
			}]`),
				);
				const result = await cli(command, true, "a.txt\nb.txt\n");
				expect(result.code).toBe(1);
				expect(result.output).toContain("Execution error");
				expect(result.output).toContain("fixture failure");
				expect(result.output).toContain(
					"Resolved Following: b.txt: independent",
				);
				expect(result.output).not.toContain("must not run");
			});

			it.each([
				"check",
				"check-native",
			] as const)("refreshes created and unstaged-deleted tracked files across fix phases: %s", async (command) => {
				await writeFile(join(testDir, "removed.txt"), "tracked");
				await simpleGit(testDir).add("removed.txt");
				await writeFile(
					configPath,
					`import {writeFile,rm} from "node:fs/promises";
						export default {policies:[{
							name:"File",description:"create and remove",match:/selected/,
							handler:async({root})=>{
								await rm(root+"/removed.txt");
								await writeFile(root+"/created.txt","created");
								return [{message:"changed",fixStatus:"fixed"}];
							}
						},{
							name:"First",description:"refresh",scope:"repository",
							handler:async({files,root})=>{
								await rm(root+"/created.txt");
								await writeFile(root+"/repository.txt","created");
								return [{message:"first="+JSON.stringify(files),fixStatus:"fixed"}];
							}
						},{
							name:"Second",description:"refresh again",scope:"repository",
							handler:async({files})=>[{message:"second="+JSON.stringify(files),fixStatus:"fixed"}]
						}]};`,
				);
				const result = await cli(command, true, "selected.txt\0");
				expect(result.code).toBe(0);
				expect(result.output).toContain(
					`first=${JSON.stringify(["created.txt", "repopo.config.mjs"])}`,
				);
				expect(result.output).toContain(
					`second=${JSON.stringify(["repopo.config.mjs", "repository.txt"])}`,
				);
				expect(result.output).not.toContain("removed.txt");
			});

			it.each([
				"check",
				"check-native",
			] as const)("continues read-only errors with NUL selection and full repository inventory: %s", async (command) => {
				await writeFile(join(testDir, "unchanged.txt"), "not selected");
				await writeFile(
					configPath,
					configSource(`[{
							name:"Broken",description:"throws",match:/txt$/,
							handler:async()=>{throw new Error("read-only fixture")}
						},{
							name:"Following",description:"continues",match:/txt$/,
							handler:async()=>[{message:"independent",manualFix:"Correct manually"}]
						},{
							name:"Repo",description:"full inventory",scope:"repository",
							handler:async({files})=>[{message:JSON.stringify(files)}]
						}]`),
				);
				const result = await cli(command, false, "a.txt\0b.txt\0");
				expect(result.code).toBe(1);
				expect(result.output).toContain("read-only fixture");
				expect(result.output).toContain("Following: a.txt: independent");
				expect(result.output).toContain("Following: b.txt: independent");
				expect(result.output).toContain("Correct manually");
				expect(result.output).toContain("unchanged.txt");
			});

			it("unwinds the sidecar when the actual native CLI is terminated", async () => {
				await writeFile(
					configPath,
					`import {call,sleep} from ${JSON.stringify(import.meta.resolve("effection"))};
					import {writeFile} from "node:fs/promises";
					export default {policies:[{
						name:"Owned",description:"cleanup",match:/./,
						handler:function*({root}){
							try{
								yield* call(()=>writeFile(root+"/started","started"));
								yield* sleep(60000);return [];
							}finally{yield* call(()=>writeFile(root+"/closed","closed"));}
						}
					}]};`,
				);
				const child = execFile(
					process.execPath,
					[
						cliPath,
						"check-native",
						"--stdin",
						"--config",
						configPath,
						"--binary-path",
						binaryPath,
						"--sidecar-path",
						sidecarPath,
						"--runtime",
						"node",
					],
					{ cwd: testDir, timeout: 15000 },
				);
				let output = "";
				child.stdout?.on("data", (chunk) => {
					output += chunk.toString();
				});
				child.stderr?.on("data", (chunk) => {
					output += chunk.toString();
				});
				const closed = new Promise<number | null>((resolvePromise) => {
					child.on("close", resolvePromise);
				});
				child.stdin?.end("a.txt\n");
				try {
					await expect
						.poll(
							() =>
								access(join(testDir, "started")).then(
									() => true,
									() => false,
								),
							{ timeout: 10000 },
						)
						.toBe(true);
					child.kill("SIGTERM");
					expect(await closed).toBe(143);
					expect(await readFile(join(testDir, "closed"), "utf8")).toBe(
						"closed",
					);
					expect(output).not.toContain("Execution error");
				} finally {
					if (child.exitCode === null) {
						child.kill("SIGKILL");
					}
				}
			});
		},
	);
});
