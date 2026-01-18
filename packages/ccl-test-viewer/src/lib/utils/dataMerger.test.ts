import { describe, expect, it } from "vitest";
import type { GeneratedTest, TestCategory } from "../data/types.js";
import type { DataSource } from "../stores/dataSource.js";
import {
	calculateStats,
	createDataSourceFromGitHub,
	createDataSourceFromUpload,
	createStaticDataSource,
	generateDataSourceId,
	jsonToTestCategory,
	mergeDataSources,
	validateTestData,
} from "./dataMerger.js";

describe("dataMerger", () => {
	describe("validateTestData", () => {
		it("rejects non-object data", () => {
			const result = validateTestData(null, "test.json");
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"JSON must be a CCL schema format object with $schema and tests properties",
			);
		});

		it("rejects array data", () => {
			const result = validateTestData([], "test.json");
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"JSON must be a CCL schema format object with $schema and tests properties",
			);
		});

		it("requires $schema property", () => {
			const result = validateTestData({ tests: [] }, "test.json");
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Missing required $schema property in CCL format",
			);
		});

		it("requires tests array", () => {
			const result = validateTestData({ $schema: "1.0" }, "test.json");
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Missing or invalid 'tests' array in CCL format",
			);
		});

		it("warns about empty tests array", () => {
			const result = validateTestData(
				{ $schema: "1.0", tests: [] },
				"test.json",
			);
			expect(result.warnings).toContain("File contains no test data");
		});

		it("validates test object structure", () => {
			const result = validateTestData(
				{
					$schema: "1.0",
					tests: [{ invalid: "test" }],
				},
				"test.json",
			);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(
				"Test at index 0 missing or invalid 'name' field",
			);
			expect(result.errors).toContain(
				"Test at index 0 missing or invalid 'inputs' field",
			);
			expect(result.errors).toContain(
				"Test at index 0 missing or invalid 'expected.count' field",
			);
		});

		it("validates valid test data successfully", () => {
			const validTest = {
				name: "test-basic",
				inputs: ["key = value"],
				expected: { count: 1 },
				functions: ["parse"],
				features: ["comments"],
				behaviors: ["strict_spacing"],
				variants: [],
				source_test: "test-basic",
				validation: "standard",
			};

			const result = validateTestData(
				{ $schema: "1.0", tests: [validTest] },
				"test.json",
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.stats.testCount).toBe(1);
			expect(result.stats.functions).toContain("parse");
			expect(result.stats.features).toContain("comments");
			expect(result.stats.behaviors).toContain("strict_spacing");
		});

		it("warns about invalid array fields", () => {
			const testWithInvalidArrays = {
				name: "test",
				inputs: ["data"],
				expected: { count: 1 },
				functions: "not-an-array",
				features: { invalid: true },
				behaviors: 123,
			};

			const result = validateTestData(
				{ $schema: "1.0", tests: [testWithInvalidArrays] },
				"test.json",
			);

			expect(result.warnings).toContain(
				"Test test has invalid 'functions' field - should be array",
			);
			expect(result.warnings).toContain(
				"Test test has invalid 'features' field - should be array",
			);
			expect(result.warnings).toContain(
				"Test test has invalid 'behaviors' field - should be array",
			);
		});

		it("collects statistics from multiple tests", () => {
			const tests = [
				{
					name: "test1",
					inputs: ["data1"],
					expected: { count: 1 },
					functions: ["parse"],
					features: ["comments"],
					behaviors: [],
				},
				{
					name: "test2",
					inputs: ["data2"],
					expected: { count: 1 },
					functions: ["parse", "filter"],
					features: ["unicode"],
					behaviors: ["strict_spacing"],
				},
			];

			const result = validateTestData({ $schema: "1.0", tests }, "test.json");

			expect(result.isValid).toBe(true);
			expect(result.stats.testCount).toBe(2);
			expect(result.stats.functions).toEqual(
				expect.arrayContaining(["parse", "filter"]),
			);
			expect(result.stats.features).toEqual(
				expect.arrayContaining(["comments", "unicode"]),
			);
			expect(result.stats.behaviors).toContain("strict_spacing");
		});
	});

	describe("jsonToTestCategory", () => {
		it("converts JSON to test category with proper naming", () => {
			const tests: GeneratedTest[] = [
				{
					name: "test1",
					inputs: ["data"],
					expected: { count: 1 },
					functions: [],
					features: [],
					behaviors: [],
					variants: [],
					source_test: "test1",
					validation: "standard",
				},
			];

			const category = jsonToTestCategory(tests, "basic-parsing.json");

			expect(category.name).toBe("Basic Parsing");
			expect(category.description).toContain("basic-parsing.json");
			expect(category.tests).toEqual(tests);
			expect(category.file).toBe("basic-parsing.json");
		});

		it("handles filenames with underscores and hyphens", () => {
			const tests: GeneratedTest[] = [];
			const category = jsonToTestCategory(tests, "test_multi-word_file.json");

			expect(category.name).toBe("Test Multi Word File");
		});

		it("removes .json extension", () => {
			const tests: GeneratedTest[] = [];
			const category = jsonToTestCategory(tests, "TestFile.JSON");

			expect(category.name).toBe("TestFile");
			expect(category.file).toBe("TestFile.JSON");
		});
	});

	describe("calculateStats", () => {
		const mockCategories: TestCategory[] = [
			{
				name: "Category 1",
				description: "Test category",
				file: "cat1.json",
				tests: [
					{
						name: "test1",
						inputs: ["data"],
						expected: { count: 5 },
						functions: ["parse"],
						features: ["comments"],
						behaviors: [],
						variants: [],
						source_test: "test1",
						validation: "standard",
					},
					{
						name: "test2",
						inputs: ["data"],
						expected: { count: 3 },
						functions: ["parse", "filter"],
						features: ["unicode"],
						behaviors: ["strict_spacing"],
						variants: [],
						source_test: "test2",
						validation: "standard",
					},
				],
			},
			{
				name: "Category 2",
				description: "Another category",
				file: "cat2.json",
				tests: [
					{
						name: "test3",
						inputs: ["data"],
						expected: { count: 2 },
						functions: ["build_hierarchy"],
						features: [],
						behaviors: [],
						variants: [],
						source_test: "test3",
						validation: "standard",
					},
				],
			},
		];

		it("calculates total tests correctly", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.totalTests).toBe(3);
		});

		it("calculates total assertions correctly", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.totalAssertions).toBe(10); // 5 + 3 + 2
		});

		it("counts categories correctly", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.categories["Category 1"]).toBe(2);
			expect(stats.categories["Category 2"]).toBe(1);
		});

		it("counts functions across all tests", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.functions.parse).toBe(2);
			expect(stats.functions.filter).toBe(1);
			expect(stats.functions.build_hierarchy).toBe(1);
		});

		it("counts features across all tests", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.features.comments).toBe(1);
			expect(stats.features.unicode).toBe(1);
		});

		it("counts behaviors across all tests", () => {
			const stats = calculateStats(mockCategories);
			expect(stats.behaviors.strict_spacing).toBe(1);
		});

		it("handles empty categories array", () => {
			const stats = calculateStats([]);
			expect(stats.totalTests).toBe(0);
			expect(stats.totalAssertions).toBe(0);
			expect(Object.keys(stats.categories)).toHaveLength(0);
		});
	});

	describe("mergeDataSources", () => {
		const mockDataSources: DataSource[] = [
			{
				id: "source1",
				name: "Source 1",
				type: "uploaded",
				active: true,
				uploadedAt: new Date(),
				categories: [
					{
						name: "Cat1",
						description: "Test",
						file: "test.json",
						tests: [],
					},
				],
				stats: { totalTests: 5, totalAssertions: 10 } as any,
			},
			{
				id: "source2",
				name: "Source 2",
				type: "github",
				active: true,
				uploadedAt: new Date(),
				categories: [
					{
						name: "Cat2",
						description: "Test",
						file: "test.json",
						tests: [],
					},
				],
				stats: { totalTests: 3, totalAssertions: 6 } as any,
			},
			{
				id: "source3",
				name: "Inactive",
				type: "uploaded",
				active: false,
				uploadedAt: new Date(),
				categories: [],
				stats: { totalTests: 100, totalAssertions: 200 } as any,
			},
		];

		it("merges only active data sources", () => {
			const result = mergeDataSources(mockDataSources);
			expect(result.mergedStats.activeSources).toBe(2);
			expect(result.mergedStats.totalSources).toBe(3);
		});

		it("prefixes non-static category names", () => {
			const result = mergeDataSources(mockDataSources);
			expect(result.categories[0].name).toBe("Source 1: Cat1");
			expect(result.categories[1].name).toBe("Source 2: Cat2");
		});

		it("preserves static source category names", () => {
			const staticSource: DataSource = {
				id: "static",
				name: "Built-in",
				type: "static",
				active: true,
				uploadedAt: new Date(),
				categories: [
					{
						name: "Original",
						description: "Test",
						file: "test.json",
						tests: [],
					},
				],
				stats: { totalTests: 1, totalAssertions: 1 } as any,
			};

			const result = mergeDataSources([staticSource]);
			expect(result.categories[0].name).toBe("Original");
		});

		it("creates source breakdown", () => {
			const result = mergeDataSources(mockDataSources);
			expect(result.mergedStats.sourceBreakdown).toHaveLength(2);
			expect(result.mergedStats.sourceBreakdown[0]).toMatchObject({
				sourceId: "source1",
				sourceName: "Source 1",
				testCount: 5,
				categoryCount: 1,
			});
		});
	});

	describe("generateDataSourceId", () => {
		it("generates unique IDs", () => {
			const id1 = generateDataSourceId();
			const id2 = generateDataSourceId();

			expect(id1).toMatch(/^ds_\d+_[a-z0-9]+$/);
			expect(id2).toMatch(/^ds_\d+_[a-z0-9]+$/);
			expect(id1).not.toBe(id2);
		});

		it("uses timestamp prefix", () => {
			const before = Date.now();
			const id = generateDataSourceId();
			const timestamp = Number.parseInt(id.split("_")[1], 10);

			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(Date.now());
		});
	});

	describe("createDataSourceFromUpload", () => {
		it("creates data source from file", () => {
			const mockFile = new File(["content"], "test-data.json", {
				type: "application/json",
			});
			const tests: GeneratedTest[] = [
				{
					name: "test1",
					inputs: ["data"],
					expected: { count: 1 },
					functions: [],
					features: [],
					behaviors: [],
					variants: [],
					source_test: "test1",
					validation: "standard",
				},
			];
			const validationResult = {
				isValid: true,
				errors: [],
				warnings: [],
				stats: {
					testCount: 1,
					categoryCount: 1,
					functions: [],
					features: [],
					behaviors: [],
				},
			};

			const dataSource = createDataSourceFromUpload(
				mockFile,
				tests,
				validationResult,
			);

			expect(dataSource.name).toBe("test-data");
			expect(dataSource.type).toBe("uploaded");
			expect(dataSource.active).toBe(true);
			expect(dataSource.filename).toBe("test-data.json");
			expect(dataSource.categories).toHaveLength(1);
			expect(dataSource.metadata?.fileSize).toBe(mockFile.size);
		});
	});

	describe("createDataSourceFromGitHub", () => {
		it("creates data source from GitHub repository", () => {
			const repositoryData = {
				files: [
					{
						name: "test.json",
						content: {
							$schema: "1.0",
							tests: [
								{
									name: "test1",
									inputs: ["data"],
									expected: { count: 1 },
								},
							],
						},
						url: "https://github.com/owner/repo/test.json",
					},
				],
				repository: {
					owner: "testowner",
					repo: "testrepo",
					branch: "main",
					path: "tests",
				},
				metadata: {
					loadedAt: new Date(),
					totalFiles: 1,
					successfulFiles: 1,
					source: "github" as const,
				},
			};

			const dataSource = createDataSourceFromGitHub(repositoryData);

			expect(dataSource.name).toBe("testowner/testrepo/tests");
			expect(dataSource.type).toBe("github");
			expect(dataSource.active).toBe(true);
			expect(dataSource.url).toBe("https://github.com/testowner/testrepo");
			expect(dataSource.metadata?.githubRepo).toBe("testowner/testrepo");
			expect(dataSource.metadata?.githubBranch).toBe("main");
		});

		it("handles non-main branch", () => {
			const repositoryData = {
				files: [],
				repository: {
					owner: "owner",
					repo: "repo",
					branch: "dev",
				},
				metadata: {
					loadedAt: new Date(),
					totalFiles: 0,
					successfulFiles: 0,
					source: "github" as const,
				},
			};

			const dataSource = createDataSourceFromGitHub(repositoryData);
			expect(dataSource.name).toBe("owner/repo@dev");
		});

		it("omits branch suffix for main branch", () => {
			const repositoryData = {
				files: [],
				repository: {
					owner: "owner",
					repo: "repo",
					branch: "main",
				},
				metadata: {
					loadedAt: new Date(),
					totalFiles: 0,
					successfulFiles: 0,
					source: "github" as const,
				},
			};

			const dataSource = createDataSourceFromGitHub(repositoryData);
			expect(dataSource.name).toBe("owner/repo");
		});
	});

	describe("createStaticDataSource", () => {
		it("creates static data source", () => {
			const categories: TestCategory[] = [
				{
					name: "Test",
					description: "Test category",
					file: "test.json",
					tests: [],
				},
			];
			const stats = {
				totalTests: 10,
				totalAssertions: 20,
				categories: {},
				functions: {},
				features: {},
				behaviors: {},
			};

			const dataSource = createStaticDataSource(categories, stats);

			expect(dataSource.id).toBe("static_default");
			expect(dataSource.name).toBe("Built-in Test Data");
			expect(dataSource.type).toBe("static");
			expect(dataSource.active).toBe(true);
			expect(dataSource.categories).toEqual(categories);
			expect(dataSource.stats).toEqual(stats);
			expect(dataSource.metadata?.originalName).toBe("ccl-test-data");
		});
	});

	describe("edge cases", () => {
		it("handles validation errors mid-loop with continue statement (lines 161-162)", () => {
			// This test triggers the continue statement when validation fails mid-loop
			// Line 161: if (!validateTestObject(test, i, errors)) {
			// Line 162: continue;
			const mixedData = {
				$schema: "1.0",
				tests: [
					{ name: "valid1", inputs: ["data"], expected: { count: 1 } },
					{ invalid: "test" }, // This will fail validateTestObject, triggering continue
					{ name: "valid2", inputs: ["data"], expected: { count: 1 } },
				],
			};

			const result = validateTestData(mixedData, "test.json");

			// Should have errors from the invalid test object
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			// validTests array has entries but because errors.length > 0, they're counted in stats
			// Line 177: testCount: validTests.length shows how many passed validation
			expect(result.stats.testCount).toBeGreaterThan(0);
		});
	});
});
