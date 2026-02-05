/**
 * Unit tests for DiceRoller DataObject.
 */

import { describe, expect, it } from "vitest";

import { DiceRollerFactory, DiceRollerName } from "../../src/diceRoller.js";

describe("DiceRollerFactory", () => {
	it("has the correct type name", () => {
		expect(DiceRollerName).toBe("dice-roller");
	});

	it("is a DataObjectFactory instance", () => {
		expect(DiceRollerFactory).toBeDefined();
		expect(DiceRollerFactory.type).toBe("dice-roller");
	});
});

describe("DiceRoller", () => {
	// Note: Full DataObject testing requires Fluid Framework test utilities
	// These are placeholder tests demonstrating the pattern

	it.todo("initializes with value of 1");
	it.todo("rolls to a value between 1 and 6");
	it.todo("emits diceRolled event when value changes");
});
