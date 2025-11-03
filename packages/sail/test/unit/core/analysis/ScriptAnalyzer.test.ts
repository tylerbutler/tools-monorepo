import { describe, expect, it } from "vitest";
import { ScriptAnalyzer } from "../../../../src/core/analysis/ScriptAnalyzer.js";

describe("ScriptAnalyzer", () => {
	const analyzer = new ScriptAnalyzer();

	describe("getDirectlyCalledScripts", () => {
		describe("npm run commands", () => {
			it("should extract script from simple npm run command", () => {
				const script = "npm run build";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["build"]);
			});

			it("should ignore npm run commands with arguments", () => {
				const script = "npm run build --watch";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				// Commands with args are excluded as "direct" calls
				expect(result).toEqual([]);
			});

			it("should throw error for unknown npm run script", () => {
				const script = "npm run unknown";
				const allScriptNames = ["build", "test"];

				expect(() => {
					analyzer.getDirectlyCalledScripts(script, allScriptNames);
				}).toThrow("Script 'unknown' not found processing command line");
			});

			it("should handle multiple npm run commands separated by &&", () => {
				const script = "npm run clean && npm run build";
				const allScriptNames = ["clean", "build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["clean", "build"]);
			});
		});

		describe("concurrently commands", () => {
			it("should extract npm scripts from concurrently command", () => {
				const script = 'concurrently "npm:build" "npm:test"';
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["build", "test"]);
			});

			it("should extract scripts with wildcard patterns", () => {
				const script = 'concurrently "npm:build*"';
				const allScriptNames = ["build", "build:prod", "build:dev", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["build", "build:prod", "build:dev"]);
			});

			it("should handle concurrently with direct commands (non-scripts)", () => {
				const script = 'concurrently "npm:build" "echo done"';
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				// Only npm:build should be extracted, direct command ignored
				expect(result).toEqual(["build"]);
			});

			it("should handle empty concurrently command", () => {
				const script = "concurrently";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual([]);
			});
		});

		describe("mixed commands", () => {
			it("should handle npm run and concurrently in same script", () => {
				const script = 'npm run clean && concurrently "npm:build" "npm:test"';
				const allScriptNames = ["clean", "build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["clean", "build", "test"]);
			});

			it("should ignore non-npm commands", () => {
				const script = "echo hello && npm run build && ls";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["build"]);
			});

			it("should handle complex chained commands", () => {
				const script =
					"npm run clean && npm run build && npm run test && npm run deploy";
				const allScriptNames = ["clean", "build", "test", "deploy"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["clean", "build", "test", "deploy"]);
			});
		});

		describe("edge cases", () => {
			it("should handle empty script", () => {
				const script = "";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual([]);
			});

			it("should handle script with only whitespace", () => {
				const script = "   ";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual([]);
			});

			it("should handle empty allScriptNames", () => {
				const script = "npm run build";
				const allScriptNames: string[] = [];

				expect(() => {
					analyzer.getDirectlyCalledScripts(script, allScriptNames);
				}).toThrow("Script 'build' not found");
			});

			it("should trim whitespace around commands", () => {
				const script = "  npm run build  &&  npm run test  ";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				expect(result).toEqual(["build", "test"]);
			});

			it("should handle duplicate script calls", () => {
				const script = "npm run build && npm run build";
				const allScriptNames = ["build", "test"];

				const result = analyzer.getDirectlyCalledScripts(script, allScriptNames);

				// Both instances should be included
				expect(result).toEqual(["build", "build"]);
			});
		});
	});

	describe("analyzeScriptDependencies", () => {
		it("should analyze dependencies for all scripts", () => {
			const packageScripts = {
				clean: "rm -rf dist",
				build: "npm run clean && tsc",
				test: "npm run build && vitest",
				publish: "npm publish",
				deploy: "npm run test && npm run publish",
			};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({
				build: ["clean"],
				test: ["build"],
				deploy: ["test", "publish"],
			});
		});

		it("should handle scripts with no dependencies", () => {
			const packageScripts = {
				clean: "rm -rf dist",
				format: "biome format .",
				lint: "biome lint .",
			};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			// No script calls other scripts, so empty result
			expect(result).toEqual({});
		});

		it("should handle scripts with concurrently dependencies", () => {
			const packageScripts = {
				build: "tsc",
				test: "vitest",
				ci: 'concurrently "npm:build" "npm:test"',
			};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({
				ci: ["build", "test"],
			});
		});

		it("should skip undefined scripts", () => {
			const packageScripts = {
				build: "tsc",
				test: undefined,
				deploy: "npm run build",
			};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({
				deploy: ["build"],
			});
		});

		it("should handle empty packageScripts", () => {
			const packageScripts = {};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({});
		});

		it("should handle complex dependency graph", () => {
			const packageScripts = {
				"clean:dist": "rm -rf dist",
				"clean:cache": "rm -rf .cache",
				clean: 'concurrently "npm:clean:dist" "npm:clean:cache"',
				compile: "npm run clean && tsc",
				bundle: "npm run compile && webpack",
				test: "npm run bundle && vitest",
			};

			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({
				clean: ["clean:dist", "clean:cache"],
				compile: ["clean"],
				bundle: ["compile"],
				test: ["bundle"],
			});
		});

		it("should handle circular dependencies (script calls itself)", () => {
			const packageScripts = {
				watch: "npm run watch",
			};

			// This creates circular dependency, but analyzer just reports it
			const result = analyzer.analyzeScriptDependencies(packageScripts);

			expect(result).toEqual({
				watch: ["watch"],
			});
		});
	});

	describe("validateScriptReferences", () => {
		it("should pass validation when all referenced scripts exist", () => {
			const script = "npm run clean && npm run build";
			const allScriptNames = ["clean", "build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});

		it("should throw error when referenced script doesn't exist", () => {
			const script = "npm run unknown";
			const allScriptNames = ["build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).toThrow("Script 'unknown' not found processing command line");
		});

		it("should throw error with specific command in message", () => {
			const script = "npm run missing && npm run build";
			const allScriptNames = ["build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).toThrow(
				"Script 'missing' not found processing command line: 'npm run missing'",
			);
		});

		it("should validate concurrently commands", () => {
			const script = 'concurrently "npm:build" "npm:test"';
			const allScriptNames = ["build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});

		it("should pass validation for scripts without npm run commands", () => {
			const script = "tsc && biome lint .";
			const allScriptNames = ["build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});

		it("should pass validation for empty script", () => {
			const script = "";
			const allScriptNames = ["build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});

		it("should validate wildcard patterns in concurrently", () => {
			const script = 'concurrently "npm:build*"';
			const allScriptNames = ["build", "build:prod", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});

		it("should handle mixed npm run and concurrently validation", () => {
			const script = 'npm run clean && concurrently "npm:build" "npm:test"';
			const allScriptNames = ["clean", "build", "test"];

			expect(() => {
				analyzer.validateScriptReferences(script, allScriptNames);
			}).not.toThrow();
		});
	});

	describe("integration scenarios", () => {
		it("should analyze and validate typical monorepo scripts", () => {
			const packageScripts = {
				clean: "rm -rf dist",
				"build:compile": "tsc",
				"build:bundle": "webpack",
				build: 'concurrently "npm:build:compile" "npm:build:bundle"',
				"test:unit": "vitest",
				"test:e2e": "playwright test",
				test: 'concurrently "npm:test:unit" "npm:test:e2e"',
				ci: "npm run build && npm run test",
			};

			// Analyze dependencies
			const dependencies = analyzer.analyzeScriptDependencies(packageScripts);

			expect(dependencies).toEqual({
				build: ["build:compile", "build:bundle"],
				test: ["test:unit", "test:e2e"],
				ci: ["build", "test"],
			});

			// Validate all scripts
			for (const [_name, script] of Object.entries(packageScripts)) {
				if (script) {
					expect(() => {
						analyzer.validateScriptReferences(
							script,
							Object.keys(packageScripts),
						);
					}).not.toThrow();
				}
			}
		});

		it("should handle pnpm workspace scripts", () => {
			const packageScripts = {
				"build:packages": "pnpm -r build",
				"test:packages": "pnpm -r test",
				ci: "npm run build:packages && npm run test:packages",
			};

			const dependencies = analyzer.analyzeScriptDependencies(packageScripts);

			expect(dependencies).toEqual({
				ci: ["build:packages", "test:packages"],
			});
		});

		it("should detect invalid script reference in complex workflow", () => {
			const packageScripts = {
				clean: "rm -rf dist",
				build: "npm run clean && npm run compile",
				// Missing 'compile' script!
			};

			expect(() => {
				analyzer.validateScriptReferences(
					packageScripts.build!,
					Object.keys(packageScripts),
				);
			}).toThrow("Script 'compile' not found");
		});
	});
});
