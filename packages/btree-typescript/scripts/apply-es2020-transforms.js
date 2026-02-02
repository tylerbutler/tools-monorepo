#!/usr/bin/env node
/**
 * Transformation script to apply ES2020 changes after pulling upstream.
 *
 * This script modifies tsconfig.json and package.json to:
 * - Target ES2020 instead of ES5
 * - Use node16 module resolution
 * - Use terser instead of uglify-js for minification
 * - Update dependencies to versions compatible with ES2020 output
 * - Remove extended/ functionality (has ES2020 compatibility issues)
 *
 * Run this after: git subrepo pull packages/btree-typescript
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);

function readRawFile(filename) {
	return fs.readFileSync(path.join(ROOT, filename), "utf8");
}

function writeFile(filename, content) {
	fs.writeFileSync(path.join(ROOT, filename), content, "utf8");
	console.log(`Updated ${filename}`);
}

// === Transform tsconfig.json ===
function transformTsconfig() {
	let content = readRawFile("tsconfig.json");

	// Replace target
	content = content.replace(
		/"target":\s*"es5"/,
		'"target": "es2020"',
	);

	// Update comment for target
	content = content.replace(
		/("target":\s*"es2020",?\s*)\/\/.*$/m,
		'$1// Modern JavaScript output',
	);

	// Replace module
	content = content.replace(
		/"module":\s*"commonjs"/,
		'"module": "node16"',
	);

	// Update comment for module
	content = content.replace(
		/("module":\s*"node16",?\s*)\/\/.*$/m,
		'$1// Node16 module system',
	);

	// Replace moduleResolution
	content = content.replace(
		/"moduleResolution":\s*"node"/,
		'"moduleResolution": "node16"',
	);

	// Update comment for moduleResolution
	content = content.replace(
		/("moduleResolution":\s*"node16",?\s*)\/\/.*$/m,
		'$1// Node16 module resolution',
	);

	writeFile("tsconfig.json", content);
}

// === Transform package.json ===
function transformPackageJson() {
	let content = readRawFile("package.json");

	// Add "type": "commonjs" after description if not present
	if (!content.includes('"type"')) {
		content = content.replace(
			/("description":\s*"[^"]*",)/,
			'$1\n  "type": "commonjs",',
		);
	}

	// Update package name
	content = content.replace(
		/"name":\s*"sorted-btree"/,
		'"name": "@tylerbu/sorted-btree-es6"',
	);

	// Replace minify script to use terser
	content = content.replace(
		/"minify":\s*"node scripts\/minify\.js"/,
		'"minify": "terser -cm -o b+tree.min.js -- b+tree.js"',
	);

	// Remove extended/* from files array (has ES2020 compatibility issues)
	content = content.replace(
		/"extended\/\*\.js",\s*\n/g,
		"",
	);
	content = content.replace(
		/"extended\/\*\.d\.ts",\s*\n/g,
		"",
	);
	content = content.replace(
		/"extended\/\*\.min\.js",\s*\n/g,
		"",
	);

	// Add extended test exclusions to testPathIgnorePatterns
	const extendedTestExclusions = [
		'"<rootDir>/test/bulkLoad.test.ts"',
		'"<rootDir>/test/diffAgainst.test.ts"',
		'"<rootDir>/test/intersect.test.ts"',
		'"<rootDir>/test/setOperationFuzz.test.ts"',
		'"<rootDir>/test/subtract.test.ts"',
		'"<rootDir>/test/union.test.ts"',
	];

	// Add exclusions if not already present
	if (!content.includes("bulkLoad.test.ts")) {
		content = content.replace(
			/("testPathIgnorePatterns":\s*\[[\s\S]*?)(\s*\],)/m,
			(_match, before, after) => {
				const exclusions = extendedTestExclusions.map((e) => `\n      ${e}`).join(",");
				return `${before},${exclusions}${after}`;
			},
		);
	}

	// Update devDependencies versions
	const devDepUpdates = {
		jest: "^29.7.0",
		"ts-jest": "^29.1.1",
		"ts-node": "^10.9.2",
		typescript: "^5.1.6",
		collections: "^5.1.11",
	};

	for (const [pkg, version] of Object.entries(devDepUpdates)) {
		const regex = new RegExp(`"${pkg}":\\s*"[^"]+"`);
		content = content.replace(regex, `"${pkg}": "${version}"`);
	}

	// Replace uglify-js with terser
	content = content.replace(
		/"uglify-js":\s*"[^"]+"/,
		'"terser": "^5.26.0"',
	);

	// Add @types/jest if not present
	if (!content.includes('"@types/jest"')) {
		content = content.replace(
			/("@types\/bintrees":\s*"[^"]+",)/,
			'"@types/jest": "^29.5.11",\n    $1',
		);
	}

	// Update @types/node
	content = content.replace(
		/"@types\/node":\s*"[^"]+"/,
		'"@types/node": "^20.10.0"',
	);

	// Remove verbose from jest config
	content = content.replace(
		/,?\s*"verbose":\s*true/,
		"",
	);

	// Change bail to true
	content = content.replace(
		/"bail":\s*false/,
		'"bail": true',
	);

	// Remove globals section from jest config (old ts-jest config)
	content = content.replace(
		/"globals":\s*\{[^}]*"ts-jest":[^}]*\{[^}]*"diagnostics":[^}]*\{[^}]*\}[^}]*\}[^}]*\},?\s*/,
		"",
	);

	writeFile("package.json", content);
}

// === Main ===
function main() {
	console.log("Applying ES2020 transformations...\n");

	transformTsconfig();
	transformPackageJson();

	console.log("\nDone! Next steps:");
	console.log("  1. Run 'pnpm install' to update dependencies");
	console.log("  2. Run 'pnpm test' to verify everything works");
}

main();
