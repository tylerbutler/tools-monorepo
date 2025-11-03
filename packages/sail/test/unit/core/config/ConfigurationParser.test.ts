import { describe, expect, it } from "vitest";
import { ConfigurationParser } from "../../../../src/core/config/ConfigurationParser.js";
import { ConfigurationError } from "../../../../src/core/errors/ConfigurationError.js";
import type { SailPackageJson } from "../../../../src/common/npmPackage.js";
import type {
	TaskConfig,
	TaskDefinitions,
} from "../../../../src/core/taskDefinitions.js";

describe("ConfigurationParser", () => {
	const parser = new ConfigurationParser();

	describe("parsePackageConfiguration", () => {
		it("should parse package.json with scripts and task definitions", () => {
			const json: SailPackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					test: "vitest",
				},
				fluidBuild: {
					tasks: {
						build: {
							dependsOn: ["^build"],
						},
					},
				},
			};

			const result = parser.parsePackageConfiguration(json);

			expect(result.scripts).toEqual({
				build: "tsc",
				test: "vitest",
			});
			expect(result.taskDefinitions).toEqual({
				build: {
					dependsOn: ["^build"],
				},
			});
		});

		it("should return empty scripts when scripts field is missing", () => {
			const json: SailPackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			const result = parser.parsePackageConfiguration(json);

			expect(result.scripts).toEqual({});
			expect(result.taskDefinitions).toBeUndefined();
		});

		it("should handle missing fluidBuild section", () => {
			const json: SailPackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			const result = parser.parsePackageConfiguration(json);

			expect(result.scripts).toEqual({ build: "tsc" });
			expect(result.taskDefinitions).toBeUndefined();
		});

		it("should handle empty fluidBuild section", () => {
			const json: SailPackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
				fluidBuild: {},
			};

			const result = parser.parsePackageConfiguration(json);

			expect(result.scripts).toEqual({ build: "tsc" });
			expect(result.taskDefinitions).toBeUndefined();
		});
	});

	describe("validateTaskConfiguration", () => {
		describe("script tasks", () => {
			it("should validate script task with matching package.json script", () => {
				const config: TaskConfig = {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				};
				const packageScripts = { build: "tsc" };

				expect(() => {
					parser.validateTaskConfiguration("build", config, packageScripts);
				}).not.toThrow();
			});

			it("should throw error when script is missing from package.json", () => {
				const config: TaskConfig = {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				};
				const packageScripts = { test: "vitest" };

				expect(() => {
					parser.validateTaskConfiguration("build", config, packageScripts);
				}).toThrow(ConfigurationError);
			});

			it("should throw error when script task invokes fluid-build with args", () => {
				const config: TaskConfig = {
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				};
				const packageScripts = { build: "fluid-build --verbose" };

				expect(() => {
					parser.validateTaskConfiguration("build", config, packageScripts);
				}).toThrow(ConfigurationError);
			});

			it("should throw error when script task invokes sail build with args", () => {
				const config: TaskConfig = {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				};
				const packageScripts = { build: "sail build --force" };

				expect(() => {
					parser.validateTaskConfiguration("build", config, packageScripts);
				}).toThrow(ConfigurationError);
			});

			it("should allow script tasks with before/after dependencies", () => {
				const config: TaskConfig = {
					dependsOn: [],
					script: true,
					before: ["test"],
					children: [],
					after: ["deploy"],
				};
				const packageScripts = { build: "tsc" };

				expect(() => {
					parser.validateTaskConfiguration("build", config, packageScripts);
				}).not.toThrow();
			});
		});

		describe("non-script tasks", () => {
			it("should validate non-script task (group task)", () => {
				const config: TaskConfig = {
					dependsOn: ["build", "test"],
					script: false,
					before: [],
					children: [],
					after: [],
				};
				const packageScripts = {};

				expect(() => {
					parser.validateTaskConfiguration("ci", config, packageScripts);
				}).not.toThrow();
			});

			it("should throw error when non-script task has before dependencies", () => {
				const config: TaskConfig = {
					dependsOn: ["build"],
					script: false,
					before: ["test"],
					children: [],
					after: [],
				};
				const packageScripts = {};

				expect(() => {
					parser.validateTaskConfiguration("ci", config, packageScripts);
				}).toThrow(ConfigurationError);
			});

			it("should throw error when non-script task has after dependencies", () => {
				const config: TaskConfig = {
					dependsOn: ["build"],
					script: false,
					before: [],
					children: [],
					after: ["deploy"],
				};
				const packageScripts = {};

				expect(() => {
					parser.validateTaskConfiguration("ci", config, packageScripts);
				}).toThrow(ConfigurationError);
			});

			it("should throw error when non-script task has both before and after", () => {
				const config: TaskConfig = {
					dependsOn: [],
					script: false,
					before: ["build"],
					children: [],
					after: ["test"],
				};
				const packageScripts = {};

				expect(() => {
					parser.validateTaskConfiguration("ci", config, packageScripts);
				}).toThrow(ConfigurationError);
			});
		});
	});

	describe("createDependencyFilters", () => {
		it("should allow caret dependencies (^)", () => {
			const globalTaskDefinitions: TaskDefinitions = {};
			const packageScripts = {};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllow("^build")).toBe(true);
			expect(filters.globalAllow("^test")).toBe(true);
		});

		it("should allow global non-script task definitions", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				ci: {
					dependsOn: ["build", "test"],
					script: false,
					before: [],
					children: [],
					after: [],
				},
			};
			const packageScripts = {};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllow("ci")).toBe(true);
		});

		it("should disallow global script task definitions (they need package scripts)", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				build: {
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				},
			};
			const packageScripts = {};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllow("build")).toBe(false);
		});

		it("should allow package script references", () => {
			const globalTaskDefinitions: TaskDefinitions = {};
			const packageScripts = {
				build: "tsc",
				test: "vitest",
			};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllow("build")).toBe(true);
			expect(filters.globalAllow("test")).toBe(true);
		});

		it("should disallow unknown task references", () => {
			const globalTaskDefinitions: TaskDefinitions = {};
			const packageScripts = {};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllow("unknown")).toBe(false);
		});

		it("should allow star (*) for globalAllowExpansionsStar", () => {
			const globalTaskDefinitions: TaskDefinitions = {};
			const packageScripts = {};

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllowExpansionsStar("*")).toBe(true);
		});

		it("should apply same rules as globalAllow for non-star dependencies", () => {
			const globalTaskDefinitions: TaskDefinitions = {
				ci: {
					dependsOn: [],
					script: false,
					before: [],
					children: [],
					after: [],
				},
			};
			const packageScripts = { build: "tsc" };

			const filters = parser.createDependencyFilters(
				globalTaskDefinitions,
				packageScripts,
			);

			expect(filters.globalAllowExpansionsStar("^build")).toBe(true);
			expect(filters.globalAllowExpansionsStar("ci")).toBe(true);
			expect(filters.globalAllowExpansionsStar("build")).toBe(true);
			expect(filters.globalAllowExpansionsStar("unknown")).toBe(false);
		});
	});

	describe("createDependencyValidators", () => {
		describe("release group root", () => {
			it("should allow all dependencies for release group root", () => {
				const taskDefinitions: Record<string, TaskConfig> = {};
				const packageScripts = {};
				const isReleaseGroupRoot = true;

				const validators = parser.createDependencyValidators(
					taskDefinitions,
					packageScripts,
					isReleaseGroupRoot,
				);

				expect(validators.invalidDependOn("anything")).toBe(false);
				expect(validators.invalidBefore("anything")).toBe(false);
				expect(validators.invalidAfter("anything")).toBe(false);
			});
		});

		describe("regular packages", () => {
			describe("invalidDependOn", () => {
				it("should allow package#task references", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidDependOn("@myorg/package#build")).toBe(false);
					expect(validators.invalidDependOn("other-pkg#test")).toBe(false);
				});

				it("should allow caret dependencies (^)", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidDependOn("^build")).toBe(false);
					expect(validators.invalidDependOn("^test")).toBe(false);
				});

				it("should allow task definition references", () => {
					const taskDefinitions: Record<string, TaskConfig> = {
						build: {
							dependsOn: [],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidDependOn("build")).toBe(false);
				});

				it("should allow package script references", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = { test: "vitest" };
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidDependOn("test")).toBe(false);
				});

				it("should invalidate unknown local references", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidDependOn("unknown")).toBe(true);
				});
			});

			describe("invalidBefore", () => {
				it("should allow star (*) for before dependencies", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidBefore("*")).toBe(false);
				});

				it("should apply same validation as dependsOn for non-star", () => {
					const taskDefinitions: Record<string, TaskConfig> = {
						build: {
							dependsOn: [],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidBefore("build")).toBe(false);
					expect(validators.invalidBefore("unknown")).toBe(true);
				});
			});

			describe("invalidAfter", () => {
				it("should allow ^* for after dependencies", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidAfter("^*")).toBe(false);
				});

				it("should allow plain * for after dependencies (passes invalidBefore)", () => {
					const taskDefinitions: Record<string, TaskConfig> = {};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					// "*" passes invalidBefore check (which allows "*"), so invalidAfter also allows it
					expect(validators.invalidAfter("*")).toBe(false);
				});

				it("should apply same validation as before for other references", () => {
					const taskDefinitions: Record<string, TaskConfig> = {
						build: {
							dependsOn: [],
							script: true,
							before: [],
							children: [],
							after: [],
						},
					};
					const packageScripts = {};
					const isReleaseGroupRoot = false;

					const validators = parser.createDependencyValidators(
						taskDefinitions,
						packageScripts,
						isReleaseGroupRoot,
					);

					expect(validators.invalidAfter("build")).toBe(false);
					expect(validators.invalidAfter("^build")).toBe(false);
					expect(validators.invalidAfter("unknown")).toBe(true);
				});
			});
		});
	});
});
