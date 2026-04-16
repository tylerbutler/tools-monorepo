import { describe, expect, it } from "vitest";
import { getFullTaskConfig } from "../../../../src/core/config/taskDefinitionUtils.js";
import type {
	TaskConfigOnDisk,
	TaskDependencies,
} from "../../../../src/core/taskDefinitions.js";

describe("taskDefinitionUtils", () => {
	describe("getFullTaskConfig", () => {
		describe("array syntax (TaskDependencies)", () => {
			it("should convert simple dependency array to full task config", () => {
				const config: TaskDependencies = ["^build", "clean"];

				const result = getFullTaskConfig(config);

				expect(result).toEqual({
					dependsOn: ["^build", "clean"],
					script: true,
					before: [],
					children: [],
					after: [],
				});
			});

			it("should handle empty dependency array", () => {
				const config: TaskDependencies = [];

				const result = getFullTaskConfig(config);

				expect(result).toEqual({
					dependsOn: [],
					script: true,
					before: [],
					children: [],
					after: [],
				});
			});

			it("should clone the dependency array", () => {
				const config: TaskDependencies = ["^build"];

				const result = getFullTaskConfig(config);

				// Modify original array
				config.push("test");

				// Result should not be affected
				expect(result.dependsOn).toEqual(["^build"]);
			});

			it("should default script to true for array syntax", () => {
				const config: TaskDependencies = ["build"];

				const result = getFullTaskConfig(config);

				expect(result.script).toBe(true);
			});

			it("should set before, children, and after to empty arrays", () => {
				const config: TaskDependencies = ["build"];

				const result = getFullTaskConfig(config);

				expect(result.before).toEqual([]);
				expect(result.children).toEqual([]);
				expect(result.after).toEqual([]);
			});
		});

		describe("object syntax (TaskConfig)", () => {
			it("should fill defaults for minimal config", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["^build"],
				};

				const result = getFullTaskConfig(config);

				expect(result).toEqual({
					dependsOn: ["^build"],
					script: true,
					before: [],
					children: [],
					after: [],
				});
			});

			it("should preserve explicitly defined fields", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["^build", "clean"],
					script: false,
					before: ["compile"],
					after: ["test"],
				};

				const result = getFullTaskConfig(config);

				expect(result).toEqual({
					dependsOn: ["^build", "clean"],
					script: false,
					before: ["compile"],
					children: [],
					after: ["test"],
				});
			});

			it("should handle undefined dependsOn", () => {
				const config: TaskConfigOnDisk = {
					script: true,
				};

				const result = getFullTaskConfig(config);

				expect(result.dependsOn).toEqual([]);
			});

			it("should default script to true when not specified", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"],
				};

				const result = getFullTaskConfig(config);

				expect(result.script).toBe(true);
			});

			it("should respect explicit script: false", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build", "test"],
					script: false,
				};

				const result = getFullTaskConfig(config);

				expect(result.script).toBe(false);
			});

			it("should handle undefined before", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"],
				};

				const result = getFullTaskConfig(config);

				expect(result.before).toEqual([]);
			});

			it("should handle undefined after", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"],
				};

				const result = getFullTaskConfig(config);

				expect(result.after).toEqual([]);
			});

			it("should always set children to empty array", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"],
				};

				const result = getFullTaskConfig(config);

				expect(result.children).toEqual([]);
			});

			it("should clone dependency arrays", () => {
				const dependsOn = ["^build"];
				const before = ["clean"];
				const after = ["test"];
				const config: TaskConfigOnDisk = {
					dependsOn,
					before,
					after,
				};

				const result = getFullTaskConfig(config);

				// Modify original arrays
				dependsOn.push("extra1");
				before.push("extra2");
				after.push("extra3");

				// Results should not be affected
				expect(result.dependsOn).toEqual(["^build"]);
				expect(result.before).toEqual(["clean"]);
				expect(result.after).toEqual(["test"]);
			});

			it("should handle empty dependency arrays", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: [],
					before: [],
					after: [],
				};

				const result = getFullTaskConfig(config);

				expect(result.dependsOn).toEqual([]);
				expect(result.before).toEqual([]);
				expect(result.after).toEqual([]);
			});

			it("should handle complex task config with all fields", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["^build", "clean"],
					script: false,
					before: ["*"],
					after: ["^*"],
				};

				const result = getFullTaskConfig(config);

				expect(result).toEqual({
					dependsOn: ["^build", "clean"],
					script: false,
					before: ["*"],
					children: [],
					after: ["^*"],
				});
			});
		});

		describe("edge cases", () => {
			it("should handle package#task syntax in dependencies", () => {
				const config: TaskDependencies = ["@myorg/package#build", "^test"];

				const result = getFullTaskConfig(config);

				expect(result.dependsOn).toEqual(["@myorg/package#build", "^test"]);
			});

			it("should handle wildcard dependencies", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"],
					before: ["*"],
					after: ["^*"],
				};

				const result = getFullTaskConfig(config);

				expect(result.before).toEqual(["*"]);
				expect(result.after).toEqual(["^*"]);
			});

			it("should handle multiple caret dependencies", () => {
				const config: TaskDependencies = ["^build", "^test", "^lint"];

				const result = getFullTaskConfig(config);

				expect(result.dependsOn).toEqual(["^build", "^test", "^lint"]);
			});

			it("should preserve order of dependencies", () => {
				const config: TaskDependencies = [
					"clean",
					"^build",
					"compile",
					"bundle",
				];

				const result = getFullTaskConfig(config);

				expect(result.dependsOn).toEqual([
					"clean",
					"^build",
					"compile",
					"bundle",
				]);
			});

			it("should handle readonly arrays from config files", () => {
				const config: TaskConfigOnDisk = {
					dependsOn: ["build"] as readonly string[],
					before: ["clean"] as readonly string[],
					after: ["test"] as readonly string[],
				};

				const result = getFullTaskConfig(config);

				// Result should be mutable
				result.dependsOn.push("extra");
				result.before.push("extra");
				result.after.push("extra");

				expect(result.dependsOn).toContain("extra");
				expect(result.before).toContain("extra");
				expect(result.after).toContain("extra");
			});
		});
	});
});
