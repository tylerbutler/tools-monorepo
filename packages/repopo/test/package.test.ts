import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface PackageManifest {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

describe("package dependency contract", () => {
	it("declares sort-package-json as a required runtime dependency", async () => {
		const packageJson: PackageManifest = JSON.parse(
			await readFile(new URL("../package.json", import.meta.url), "utf8"),
		);

		expect(packageJson.dependencies?.["sort-package-json"]).toBeDefined();
		expect(packageJson.peerDependencies?.["sort-package-json"]).toBeUndefined();
		expect(
			packageJson.peerDependenciesMeta?.["sort-package-json"],
		).toBeUndefined();
	});
});
