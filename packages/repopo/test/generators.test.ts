import { describe, expect, it } from "vitest";
import { isGeneratorFunction } from "../src/generators.js";

describe("isGeneratorFunction", () => {
	it("should return true for generator functions", () => {
		function* generatorFunc() {
			yield 1;
			yield 2;
		}

		expect(isGeneratorFunction(generatorFunc)).toBe(true);
	});

	it("should return false for regular functions", () => {
		function regularFunc() {
			return 1;
		}

		expect(isGeneratorFunction(regularFunc)).toBe(false);
	});

	it("should return false for async functions", () => {
		async function asyncFunc() {
			return 1;
		}

		expect(isGeneratorFunction(asyncFunc)).toBe(false);
	});

	it("should return false for arrow functions", () => {
		const arrowFunc = () => 1;

		expect(isGeneratorFunction(arrowFunc)).toBe(false);
	});

	it("should return false for async generator functions", () => {
		async function* asyncGeneratorFunc() {
			yield 1;
			yield 2;
		}

		// Async generators have constructor name "AsyncGeneratorFunction", not "GeneratorFunction"
		expect(isGeneratorFunction(asyncGeneratorFunc)).toBe(false);
	});

	it("should return false for class constructors", () => {
		class TestClass {
			constructor() {}
		}

		expect(isGeneratorFunction(TestClass)).toBe(false);
	});

	it("should return false for class methods", () => {
		class TestClass {
			method() {
				return 1;
			}
		}

		const instance = new TestClass();
		expect(isGeneratorFunction(instance.method)).toBe(false);
	});

	it("should return true for generator class methods", () => {
		class TestClass {
			*generatorMethod() {
				yield 1;
			}
		}

		const instance = new TestClass();
		expect(isGeneratorFunction(instance.generatorMethod)).toBe(true);
	});
});
