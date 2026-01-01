import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageFormatScripts,
	type PackageFormatScriptsConfig,
} from "../../src/policies/PackageFormatScripts.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageFormatScripts policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-format-scripts-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (json: PackageJson): string => {
		const filePath = join(tempDir, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return filePath;
	};

	const createArgs = (
		filePath: string,
		config?: PackageFormatScriptsConfig,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should skip validation", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("requireIfDependencyPresent", () => {
		it("should skip validation when no format dependency is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
				devDependencies: {
					typescript: "^5.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					requireIfDependencyPresent: ["prettier"],
					scripts: {
						format: { required: true },
					},
				}),
			);
			expect(result).toBe(true);
		});

		it("should validate when prettier dependency is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
				devDependencies: {
					prettier: "^3.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					requireIfDependencyPresent: ["prettier"],
					scripts: {
						format: { required: true },
					},
				}),
			);

			expect(result).not.toBe(true);
		});

		it("should validate when biome dependency is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
				devDependencies: {
					"@biomejs/biome": "^1.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					requireIfDependencyPresent: ["@biomejs/biome"],
					scripts: {
						format: { required: true },
					},
				}),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("alwaysRequire", () => {
		it("should validate even without dependencies when alwaysRequire is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {
						format: { required: true },
					},
				}),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("script validation", () => {
		describe("required scripts", () => {
			it("should fail when required script is missing", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						build: "tsc",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { required: true },
						},
					}),
				);

				expect(result).not.toBe(true);
				if (typeof result === "object") {
					expect(result.errorMessage).toContain("format");
					expect(result.errorMessage).toContain("Missing");
				}
			});

			it("should pass when required script exists", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "prettier --write .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { required: true },
						},
					}),
				);
				expect(result).toBe(true);
			});
		});

		describe("mustContain patterns", () => {
			it("should pass when script contains required pattern", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "prettier --write .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustContain: ["prettier --write"] },
						},
					}),
				);
				expect(result).toBe(true);
			});

			it("should pass when script contains any of the patterns", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "biome format --write .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustContain: ["prettier --write", "biome format"] },
						},
					}),
				);
				expect(result).toBe(true);
			});

			it("should fail when script does not contain any required pattern", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "eslint --fix .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustContain: ["prettier --write", "biome format"] },
						},
					}),
				);

				expect(result).not.toBe(true);
				if (typeof result === "object") {
					expect(result.errorMessage).toContain("prettier --write");
					expect(result.errorMessage).toContain("biome format");
				}
			});
		});

		describe("mustNotContain patterns", () => {
			it("should pass when script does not contain forbidden pattern", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "prettier --write .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustNotContain: ["eslint --fix"] },
						},
					}),
				);
				expect(result).toBe(true);
			});

			it("should fail when script contains forbidden pattern", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "prettier --write . && eslint --fix .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustNotContain: ["eslint --fix"] },
						},
					}),
				);

				expect(result).not.toBe(true);
				if (typeof result === "object") {
					expect(result.errorMessage).toContain("must not contain");
					expect(result.errorMessage).toContain("eslint --fix");
				}
			});
		});

		describe("combined rules", () => {
			it("should validate multiple scripts", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "prettier --write .",
						"check:format": "prettier --check .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustContain: ["prettier --write"] },
							"check:format": { mustContain: ["prettier --check"] },
						},
					}),
				);
				expect(result).toBe(true);
			});

			it("should report all validation failures", async () => {
				const json: PackageJson = {
					name: "test-package",
					version: "1.0.0",
					scripts: {
						format: "eslint --fix .",
					},
				};
				const filePath = createPackageJson(json);

				const result = await PackageFormatScripts.handler(
					createArgs(filePath, {
						alwaysRequire: true,
						scripts: {
							format: { mustContain: ["prettier"] },
							"check:format": { required: true },
						},
					}),
				);

				expect(result).not.toBe(true);
				if (typeof result === "object") {
					expect(result.errorMessage).toContain("format");
					expect(result.errorMessage).toContain("check:format");
				}
			});
		});
	});

	describe("excludePackages", () => {
		it("should skip validation for excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/excluded",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {
						format: { required: true },
					},
					excludePackages: ["@myorg/excluded"],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {
						format: { required: true },
					},
				}),
			);
			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {
						format: { required: true },
					},
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when no scripts are configured", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {},
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageFormatScripts.name).toBe("PackageFormatScripts");
		});

		it("should mark failures as not auto-fixable", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageFormatScripts.handler(
				createArgs(filePath, {
					alwaysRequire: true,
					scripts: {
						format: { required: true },
					},
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});
	});
});
