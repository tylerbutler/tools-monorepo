import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { arch, platform } from "node:process";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import Parser from "tree-sitter";
import type ccl from "tree-sitter-ccl";
import { expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

it("loads a prebuilt language without a local build directory", async () => {
	const destination = await mkdtemp(join(tmpdir(), "ccl-prebuild-"));
	try {
		await mkdir(join(destination, "bindings/node"), { recursive: true });
		await mkdir(join(destination, "src"));
		await cp(
			join(packageRoot, "bindings/node/index.cjs"),
			join(destination, "bindings/node/index.cjs"),
		);
		await cp(
			join(packageRoot, "src/node-types.json"),
			join(destination, "src/node-types.json"),
		);
		await cp(
			join(packageRoot, "prebuilds", `${platform}-${arch}`),
			join(destination, "prebuilds", `${platform}-${arch}`),
			{ recursive: true },
		);
		await symlink(
			join(packageRoot, "node_modules"),
			join(destination, "node_modules"),
			"junction",
		);

		const language: typeof ccl = require(
			join(destination, "bindings/node/index.cjs"),
		);
		const parser = new Parser();
		parser.setLanguage(language);
		const tree = parser.parse("name = value\n");
		const query = new Parser.Query(language, "(single_line_key) @key");
		expect(
			query.captures(tree.rootNode).map(({ node }) => node.text.trim()),
		).toEqual(["name"]);
	} finally {
		await rm(destination, { recursive: true, force: true });
	}
});
