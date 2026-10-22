import { createHash } from "node:crypto";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { builtinModules, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { parse } from "acorn";
import { build, transform } from "esbuild";
import { analyze } from "eslint-scope";
import { parse as parseJsonc } from "jsonc-parser";
import { dirname, extname, join, resolve } from "pathe";

const directory = dirname(fileURLToPath(import.meta.url));
const producer = resolve(fileURLToPath(import.meta.url));
const builtins = new Set(
	builtinModules.map((name) => name.replace(/^node:/, "")),
);
const hash = (value) => createHash("sha256").update(value).digest("hex");

export async function fingerprint(path) {
	try {
		const info = await stat(path);
		const realPath = resolve(await realpath(path));
		if (info.isDirectory()) {
			const entries = (await readdir(path)).sort((a, b) =>
				Buffer.compare(Buffer.from(a), Buffer.from(b)),
			);
			return {
				path,
				realPath,
				kind: "directory",
				digest: hash(entries.join("\0")),
			};
		}
		if (!info.isFile()) {
			throw new Error(`Unsupported preparation input: ${path}`);
		}
		return { path, realPath, kind: "file", digest: hash(await readFile(path)) };
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		return { path, realPath: null, kind: "missing", digest: "" };
	}
}

/** Compile config code without importing or evaluating it. */
export async function prepareBundle(root, config) {
	root = resolve(await realpath(root));
	const request = resolve(root, config ?? ".");
	const inputs = new Map();
	const snapshots = new Map();
	const reasons = new Map();
	const remember = async (path) => {
		path = resolve(path);
		if (!snapshots.has(path)) {
			snapshots.set(
				path,
				fingerprint(path).then((input) => {
					inputs.set(path, input);
					return input;
				}),
			);
		}
		return snapshots.get(path);
	};
	const recordTsconfig = async (path, seen = new Set()) => {
		if (seen.has(path)) return;
		seen.add(path);
		const input = await remember(path);
		if (input.kind !== "file") return;
		const text = await readFile(path, "utf8");
		const errors = [];
		const json = parseJsonc(text, errors, { allowTrailingComma: true });
		if (errors.length) throw new Error(`Invalid tsconfig JSON: ${path}`);
		if (json.extends !== undefined) {
			const values = json.extends;
			for (const name of typeof values === "string" ? [values] : values) {
				let candidate;
				if (name.startsWith(".")) {
					candidate = resolve(dirname(path), name);
					if (!extname(candidate)) candidate += ".json";
				} else {
					await recordResolution(name, dirname(path));
					const segments = name.split("/");
					const length = name.startsWith("@") ? 2 : 1;
					const packageName = segments.slice(0, length).join("/");
					for (let parent = dirname(path); ; parent = dirname(parent)) {
						const directory = join(parent, "node_modules", packageName);
						if ((await remember(directory)).kind === "directory") {
							const manifest = await remember(join(directory, "package.json"));
							const metadata =
								manifest.kind === "file"
									? JSON.parse(await readFile(manifest.path, "utf8"))
									: {};
							const subpath = segments.slice(length).join("/");
							const target = resolve(
								directory,
								subpath || metadata.tsconfig || "tsconfig.json",
							);
							await recordTsconfig(target, seen);
							if (!extname(target))
								await recordTsconfig(`${target}.json`, seen);
						}
						if (parent === dirname(parent)) break;
					}
					try {
						candidate = createRequire(path).resolve(name);
					} catch (error) {
						if (
							!["MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED"].includes(
								error.code,
							)
						)
							throw error;
						// Published JS packages can retain dev-only tsconfig extends.
						await remember(join(dirname(path), "node_modules", name));
						continue;
					}
					if (extname(candidate) !== ".json") continue;
				}
				await recordTsconfig(candidate, seen);
			}
		}
	};
	const parents = new Set();
	const recordParents = async (path) => {
		await remember(dirname(path));
		for (let parent = dirname(path); ; parent = dirname(parent)) {
			if (parents.has(parent)) break;
			parents.add(parent);
			await remember(join(parent, "package.json"));
			await remember(join(parent, "pnpm-lock.yaml"));
			await remember(join(parent, "pnpm-workspace.yaml"));
			await recordTsconfig(join(parent, "tsconfig.json"));
			await remember(join(parent, "node_modules"));
			if (parent === dirname(parent)) break;
		}
	};
	const recordResolution = async (specifier, from) => {
		if (
			specifier.startsWith(".") ||
			specifier.startsWith("/") ||
			specifier.startsWith("file:")
		)
			return;
		const segments = specifier.split("/");
		const name = segments.slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
		for (let parent = from; ; parent = dirname(parent)) {
			const modules = join(parent, "node_modules");
			await remember(modules);
			if (name.startsWith("@")) await remember(join(modules, segments[0]));
			await remember(join(modules, name));
			await remember(join(modules, name, "package.json"));
			if (parent === dirname(parent)) break;
		}
	};
	const recordTree = async (path) => {
		const input = await remember(path);
		if (input.kind !== "directory") return;
		for (const name of await readdir(path)) {
			if (name !== "node_modules") await recordTree(join(path, name));
		}
	};
	const compilerPackages = new Set();
	const recordCompilerPackage = async (module, from = producer) => {
		const path = createRequire(from).resolve(module);
		await remember(path);
		await recordParents(path);
		for (let parent = dirname(path); ; parent = dirname(parent)) {
			const manifest = await remember(join(parent, "package.json"));
			if (manifest.kind === "file") {
				const json = JSON.parse(await readFile(manifest.path, "utf8"));
				if (json.name === module) {
					if (compilerPackages.has(parent)) return;
					compilerPackages.add(parent);
					await recordTree(parent);
					for (const dependency of Object.keys(json.dependencies ?? {}))
						await recordCompilerPackage(dependency, path);
					return;
				}
			}
			if (parent === dirname(parent))
				throw new Error(`Cannot identify compiler dependency: ${module}`);
		}
	};
	await remember(producer);
	for (const name of await readdir(join(directory, "shims"))) {
		if (name.endsWith(".mjs")) await remember(join(directory, "shims", name));
	}
	await recordParents(producer);
	for (const module of [
		"esbuild",
		"jsonc-parser",
		"pathe",
		"acorn",
		"eslint-scope",
	])
		await recordCompilerPackage(module);
	const compiler = createRequire(import.meta.url).resolve(
		"esbuild/package.json",
	);
	await remember(join(dirname(compiler), "bin/esbuild"));
	const compilerRequire = createRequire(compiler);
	const nativeName = `@esbuild/${process.platform}-${process.arch}/${process.platform === "win32" ? "esbuild.exe" : "bin/esbuild"}`;
	const binary =
		process.env.ESBUILD_BINARY_PATH ?? compilerRequire.resolve(nativeName);
	await remember(binary);
	await recordParents(binary);
	let configPath;
	const requested = await remember(request);
	if (requested.kind === "file") {
		configPath = request;
	} else if (requested.kind === "directory") {
		for (let parent = request; ; parent = dirname(parent)) {
			for (const name of [
				"repopo.config.ts",
				"repopo.config.mjs",
				"repopo.config.cjs",
			]) {
				const candidate = await remember(join(parent, name));
				if (candidate.kind === "file") {
					configPath = candidate.path;
					break;
				}
			}
			if (configPath || parent === dirname(parent)) break;
		}
	} else {
		throw new Error(`Config path does not exist: ${request}`);
	}
	const aliases = new Map([
		["fs", "fs-shim.mjs"],
		["graceful-fs", "fs-shim.mjs"],
		["fs/promises", "fs-promises-shim.mjs"],
		["path", "path-shim.mjs"],
		["os", "os-shim.mjs"],
		["url", "url-shim.mjs"],
		["assert", "assert-shim.mjs"],
		["assert/strict", "assert-strict-shim.mjs"],
		["effection", "effection-shim.mjs"],
	]);
	const packageManifest = JSON.parse(
		await readFile(join(directory, "../package.json"), "utf8"),
	);
	const optionalPeers = new Set(
		Object.entries(packageManifest.peerDependenciesMeta ?? {})
			.filter(([, metadata]) => metadata.optional)
			.map(([name]) => name),
	);
	const entry = [
		`import ${JSON.stringify(join(directory, "shims/console-shim.mjs"))};`,
		`import { DefaultPolicyConfig } from ${JSON.stringify(join(directory, "../esm/config.js"))};`,
		configPath
			? `import importedConfig from ${JSON.stringify(configPath)}; const config = importedConfig.default ?? importedConfig;`
			: "const config = DefaultPolicyConfig;",
		`import { initBridge } from ${JSON.stringify(join(directory, "shims/quickjs-bridge.mjs"))};`,
		"initBridge({ ...config, policies: config.policies ?? DefaultPolicyConfig.policies });",
	].join("\n");
	const compatibility = (module, reason) =>
		reasons.set(`${module}:${reason}`, { module, reason });
	let result;
	try {
		result = await build({
			stdin: {
				contents: entry,
				resolveDir: root,
				sourcefile: "repopo-prepared-entry.mjs",
				loader: "js",
			},
			absWorkingDir: root,
			bundle: true,
			write: false,
			metafile: true,
			format: "iife",
			platform: "neutral",
			mainFields: ["module", "main"],
			target: "es2020",
			logLevel: "silent",
			logOverride: {
				"impossible-typeof": "silent",
				"unsupported-dynamic-import": "warning",
				"unsupported-require-call": "warning",
				"indirect-require": "warning",
				"direct-eval": "warning",
			},
			plugins: [
				{
					name: "repopo-preparation",
					setup(builder) {
						builder.onResolve({ filter: /^file:/ }, (args) => {
							const url = new URL(args.path);
							return url.search || url.hash
								? { path: args.path, external: true }
								: { path: fileURLToPath(url) };
						});
						builder.onResolve({ filter: /^[^./]/ }, async (args) => {
							const name = args.path.replace(/^node:/, "");
							const shim = aliases.get(name);
							if (name === "path" && process.platform === "win32")
								compatibility(
									"path.win32",
									"Windows path operations require IPC",
								);
							if (shim) return { path: join(directory, "shims", shim) };
							if (builtins.has(name) || args.path.startsWith("node:")) {
								return { path: `node:${name}`, external: true };
							}
							await recordResolution(args.path, args.resolveDir);
							if (
								args.kind === "dynamic-import" &&
								optionalPeers.has(args.path) &&
								args.importer.startsWith(resolve(directory, "../esm") + "/")
							) {
								try {
									createRequire(args.importer).resolve(args.path);
								} catch (error) {
									if (error.code === "MODULE_NOT_FOUND")
										return { path: args.path, external: true };
									if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED")
										throw error;
								}
							}
							// CLI entry-point re-exports are unused in policy configs.
							if (args.path === "@oclif/core")
								return { path: args.path, external: true, sideEffects: false };
							// fdir's CommonJS export has static, bundleable picomatch imports.
							if (args.path === "fdir")
								return {
									path: createRequire(args.importer).resolve(args.path),
								};
							return null;
						});
						builder.onLoad(
							{ filter: /.*/, namespace: "file" },
							async (args) => {
								const before = await remember(args.path);
								await recordParents(args.path);
								const contents = await readFile(args.path, "utf8");
								if (hash(contents) !== before.digest)
									throw new Error(
										`Input changed during preparation: ${args.path}`,
									);
								const extension = extname(args.path);
								const loader =
									extension === ".json"
										? "json"
										: [".ts", ".mts", ".cts"].includes(extension)
											? "ts"
											: "js";
								if (loader === "json") return { contents, loader };
								const transformed = await transform(contents, {
									loader,
									target: "es2020",
									supported: { "top-level-await": true },
									define: {
										"import.meta.url": JSON.stringify(
											pathToFileURL(args.path).href,
										),
										__dirname: JSON.stringify(dirname(args.path)),
										__filename: JSON.stringify(args.path),
									},
									logLevel: "silent",
									logOverride: { "impossible-typeof": "silent" },
								});
								for (const warning of transformed.warnings) {
									compatibility(args.path, warning.text);
								}
								const ast = parse(transformed.code, {
									ecmaVersion: "latest",
									sourceType: "module",
									allowReturnOutsideFunction: true,
								});
								const nodes = [];
								walk(ast, (node) => nodes.push(node));
								for (const node of nodes) {
									if (
										node.type === "ImportDeclaration" &&
										["path", "node:path"].includes(node.source.value) &&
										node.specifiers.some(
											(specifier) => specifier.imported?.name === "win32",
										)
									)
										compatibility(
											"path.win32",
											"Windows path operations require IPC",
										);
								}
								const boundRequire = nodes.some(
									(node) =>
										([
											"VariableDeclarator",
											"FunctionDeclaration",
											"ClassDeclaration",
										].includes(node.type) &&
											bindsRequire(node.id)) ||
										(node.type === "CatchClause" && bindsRequire(node.param)) ||
										(node.type.includes("Function") &&
											node.params?.some(bindsRequire)) ||
										(node.type.startsWith("Import") &&
											bindsRequire(node.local)) ||
										(node.type === "AssignmentExpression" &&
											bindsRequire(node.left)),
								);
								const replacements = [];
								if (!boundRequire) {
									for (const node of nodes) {
										if (
											node.type !== "CallExpression" ||
											node.callee.type !== "MemberExpression" ||
											node.callee.object.name !== "require" ||
											node.callee.property.name !== "resolve" ||
											node.arguments.length !== 1 ||
											typeof node.arguments[0].value !== "string"
										)
											continue;
										const specifier = node.arguments[0].value;
										await recordResolution(specifier, dirname(args.path));
										const resolved = createRequire(args.path).resolve(
											specifier,
										);
										await remember(resolved);
										await recordParents(resolved);
										replacements.push({
											start: node.start,
											end: node.end,
											value: JSON.stringify(resolved),
										});
									}
								}
								let code = transformed.code;
								for (const replacement of replacements.sort(
									(a, b) => b.start - a.start,
								))
									code =
										code.slice(0, replacement.start) +
										replacement.value +
										code.slice(replacement.end);
								return { contents: code, loader: "js" };
							},
						);
					},
				},
			],
		});
	} catch (error) {
		if (
			!error.errors?.length ||
			error.errors.some(
				(item) =>
					!(
						item.text.includes("No matching export") &&
						item.text.includes("/shims/")
					) && !item.text.includes("Top-level await"),
			)
		)
			throw error;
		for (const item of error.errors)
			compatibility(item.location?.file ?? "shim", item.text);
	}
	if (result) {
		for (const output of Object.values(result.metafile.outputs)) {
			for (const imported of output.imports) {
				if (imported.external)
					compatibility(
						imported.path,
						"Requires an unsupported runtime module",
					);
			}
		}
		for (const warning of result.warnings) {
			if (
				[
					"unsupported-dynamic-import",
					"unsupported-require-call",
					"direct-eval",
					"indirect-require",
					"empty-import-meta",
				].includes(warning.id) ||
				(warning.id === "import-is-undefined" &&
					warning.text.includes("/shims/"))
			) {
				compatibility(warning.location?.file ?? "config", warning.text);
			} else {
				throw new Error(`Preparation warning: ${warning.text}`);
			}
		}
		inspectCompatibility(result.outputFiles[0].text, compatibility);
	}
	for (const before of inputs.values()) {
		if (
			JSON.stringify(await fingerprint(before.path)) !== JSON.stringify(before)
		) {
			throw new Error(`Input changed during preparation: ${before.path}`);
		}
	}
	const bundle = result?.outputFiles[0].text ?? "";
	return {
		schemaVersion: 1,
		abiVersion: 1,
		root,
		request,
		producer,
		inputs: [...inputs.values()].sort((a, b) => a.path.localeCompare(b.path)),
		bundle,
		bundleDigest: hash(bundle),
		reasons: [...reasons.values()],
	};
}

function walk(node, visit, parent) {
	if (!node || typeof node !== "object") return;
	if (typeof node.type === "string") visit(node, parent);
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const child of value) walk(child, visit, node);
		} else if (value && typeof value === "object") walk(value, visit, node);
	}
}

function inspectCompatibility(code, report) {
	const ast = parse(code, {
		ecmaVersion: "latest",
		sourceType: "script",
		ranges: true,
	});
	const globals = new Set(
		analyze(ast, {
			ecmaVersion: 2024,
			sourceType: "script",
			ignoreEval: true,
		}).globalScope.through.map((reference) => reference.identifier),
	);
	const processProperties = new Set([
		"cwd",
		"env",
		"platform",
		"arch",
		"argv",
		"argv0",
		"execArgv",
		"execPath",
		"pid",
		"title",
		"versions",
		"stdout",
		"stderr",
		"stdin",
		"nextTick",
	]);
	const bufferProperties = new Set([
		"from",
		"isBuffer",
		"isEncoding",
		"byteLength",
		"alloc",
		"concat",
	]);
	const unsupportedGlobals = new Set([
		"fetch",
		"setTimeout",
		"setInterval",
		"setImmediate",
		"clearTimeout",
		"clearInterval",
		"clearImmediate",
		"TextEncoder",
		"TextDecoder",
		"structuredClone",
		"WebAssembly",
		"Worker",
		"URLSearchParams",
		"performance",
		"crypto",
	]);
	function access(node) {
		if (node.type === "Identifier" && globals.has(node)) return [node.name];
		if (node.type !== "MemberExpression") return [];
		const object = access(node.object);
		if (!object.length) return [];
		const property = node.computed ? node.property.value : node.property.name;
		return object[0] === "globalThis" ? [property] : [...object, property];
	}
	walk(ast, (node, parent) => {
		const path = access(node);
		const name = path[0];
		if (
			node.type === "MemberExpression" &&
			[
				"deepEqual",
				"deepStrictEqual",
				"notDeepEqual",
				"notDeepStrictEqual",
			].includes(node.computed ? node.property.value : node.property.name) &&
			!(parent?.type === "AssignmentExpression" && parent.left === node)
		)
			report("assert", "Deep assertions require IPC");
		if (
			node.type === "MemberExpression" &&
			(node.computed ? node.property.value : node.property.name) === "win32" &&
			!(parent?.type === "AssignmentExpression" && parent.left === node)
		)
			report("path.win32", "Windows path operations require IPC");
		if (
			node.type === "ImportExpression" ||
			(node.type === "CallExpression" &&
				["require", "__require", "eval"].includes(node.callee.name) &&
				(globals.has(node.callee) || node.callee.name === "__require"))
		) {
			report(
				node.callee?.name ?? "import()",
				"Requires runtime code or module loading",
			);
		}
		if (
			node.type === "MemberExpression" &&
			(name === "require" || node.object.name === "__require")
		)
			report("require", "Requires runtime module resolution");
		if (
			node.type === "MemberExpression" &&
			name === "process" &&
			path.length > 1
		) {
			if (
				!processProperties.has(path[1]) ||
				(["stdout", "stderr", "stdin"].includes(path[1]) &&
					path.length > 2 &&
					!["write", "isTTY"].includes(path[2]))
			)
				report(path.join("."), "Requires an unsupported process API");
		}
		if (
			name === "process" &&
			path.length === 1 &&
			parent?.type !== "UnaryExpression" &&
			!(parent?.type === "MemberExpression" && parent.object === node)
		)
			report("process", "Requires untracked process access");
		if (
			node.type === "MemberExpression" &&
			name === "Buffer" &&
			path.length > 1 &&
			!bufferProperties.has(path[1])
		)
			report(path.join("."), "Requires an unsupported Buffer API");
		if (
			node.type === "MemberExpression" &&
			name === "console" &&
			path.length > 1 &&
			!["log", "info", "debug", "warn", "error"].includes(path[1])
		)
			report(path.join("."), "Requires an unsupported console API");
		if (["CallExpression", "NewExpression"].includes(node.type)) {
			const callee = access(node.callee);
			if (
				callee[0] === "console" &&
				(node.arguments.some((argument) =>
					["ObjectExpression", "ArrayExpression"].includes(argument.type),
				) ||
					(node.arguments.length > 1 &&
						typeof node.arguments[0].value === "string" &&
						/%[sdifjoOc%]/.test(node.arguments[0].value)))
			)
				report(
					callee.join("."),
					"Console inspection and formatting require IPC",
				);
			if (
				callee[0] === "Buffer" &&
				["from", "byteLength"].includes(callee[1]) &&
				typeof node.arguments[1]?.value === "string" &&
				!["utf8", "utf-8", "hex", "latin1", "binary", "ascii"].includes(
					node.arguments[1].value.toLowerCase(),
				)
			)
				report(
					callee.join("."),
					`Unsupported Buffer encoding: ${node.arguments[1].value}`,
				);
			if (
				unsupportedGlobals.has(callee[0]) ||
				(callee.length === 1 && ["Function", "Buffer"].includes(callee[0]))
			)
				report(callee.join("."), "Requires an unsupported host capability");
		}
	});
}

function bindsRequire(pattern) {
	if (!pattern) return false;
	if (pattern.type === "Identifier") return pattern.name === "require";
	if (pattern.type === "RestElement") return bindsRequire(pattern.argument);
	if (pattern.type === "AssignmentPattern") return bindsRequire(pattern.left);
	if (pattern.type === "ArrayPattern")
		return pattern.elements.some(bindsRequire);
	if (pattern.type === "ObjectPattern")
		return pattern.properties.some((entry) =>
			bindsRequire(entry.value ?? entry.argument),
		);
	return false;
}

if (process.argv[1] && resolve(process.argv[1]) === producer) {
	const { values } = parseArgs({
		options: { "git-root": { type: "string" }, config: { type: "string" } },
	});
	try {
		const artifact = await prepareBundle(
			values["git-root"] ?? process.cwd(),
			values.config,
		);
		await new Promise((resolveWrite, reject) =>
			process.stdout.write(`${JSON.stringify(artifact)}\n`, (error) =>
				error ? reject(error) : resolveWrite(),
			),
		);
	} catch (error) {
		console.error(`Preparation failed: ${error.message}`);
		process.exitCode = 1;
	}
}
