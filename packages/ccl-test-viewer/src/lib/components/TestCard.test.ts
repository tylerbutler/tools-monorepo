import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedTest } from "$lib/data/types.js";
import TestCard from "./TestCard.svelte";

// Skip these tests for now due to Svelte 5 compatibility issues
// TODO: Update when Svelte 5 testing support is stable

const mockTest: GeneratedTest = {
	name: "test-basic-parsing",
	input: "key = value\nother = data",
	expected: {
		entries: [
			{ key: "key", value: "value" },
			{ key: "other", value: "data" },
		],
		count: 2,
	},
	functions: ["parse"],
	features: [],
	behaviors: [],
	variants: [],
	source_test: "test-basic-parsing",
	validation: "standard",
};

describe("TestCard", () => {
	it("renders test information correctly", () => {
		const mockOnView = vi.fn();
		const { getByText, getByLabelText } = render(TestCard, {
			props: { test: mockTest, onView: mockOnView },
		});

		expect(getByText("test-basic-parsing")).toBeInTheDocument();
		expect(getByText("parse")).toBeInTheDocument();
		expect(getByText("2 entries")).toBeInTheDocument();
		expect(
			getByLabelText("View test case: test-basic-parsing"),
		).toBeInTheDocument();
	});

	it("calls onView when clicked", async () => {
		const onView = vi.fn();
		const { getByLabelText } = render(TestCard, {
			props: { test: mockTest, onView },
		});

		const card = getByLabelText("View test case: test-basic-parsing");
		await fireEvent.click(card);

		expect(onView).toHaveBeenCalledTimes(1);
		expect(onView).toHaveBeenCalledWith(mockTest);
	});

	it("handles keyboard navigation", async () => {
		const onView = vi.fn();
		const { getByLabelText } = render(TestCard, {
			props: { test: mockTest, onView },
		});

		const card = getByLabelText("View test case: test-basic-parsing");

		// Test Enter key
		await fireEvent.keyDown(card, { key: "Enter" });
		expect(onView).toHaveBeenCalledTimes(1);

		// Test Space key
		await fireEvent.keyDown(card, { key: " " });
		expect(onView).toHaveBeenCalledTimes(2);

		// Test other keys (should not trigger)
		await fireEvent.keyDown(card, { key: "Tab" });
		expect(onView).toHaveBeenCalledTimes(2);
	});

	it("displays function badges correctly", () => {
		const testWithMultipleFunctions: GeneratedTest = {
			...mockTest,
			functions: ["parse", "get_string", "build_hierarchy"],
		};

		const mockOnView = vi.fn();
		const { getByText } = render(TestCard, {
			props: { test: testWithMultipleFunctions, onView: mockOnView },
		});

		expect(getByText("parse")).toBeInTheDocument();
		expect(getByText("get_string")).toBeInTheDocument();
		expect(getByText("build_hierarchy")).toBeInTheDocument();
	});

	it("displays feature badges when present", () => {
		const testWithFeatures: GeneratedTest = {
			...mockTest,
			features: ["comments", "unicode"],
		};

		const mockOnView = vi.fn();
		const { getByText } = render(TestCard, {
			props: { test: testWithFeatures, onView: mockOnView },
		});

		expect(getByText("comments")).toBeInTheDocument();
		expect(getByText("unicode")).toBeInTheDocument();
	});

	it("formats expected output correctly for different types", () => {
		// Test error expected
		const errorTest: GeneratedTest = {
			...mockTest,
			expected: { error: true, count: 0 },
		};
		const mockOnView = vi.fn();
		const { getByText: getByTextError } = render(TestCard, {
			props: { test: errorTest, onView: mockOnView },
		});
		expect(getByTextError("Error expected: true")).toBeInTheDocument();

		// Test object result
		const objectTest: GeneratedTest = {
			...mockTest,
			expected: { object: {}, count: 1 },
		};
		const { getByText: getByTextObject } = render(TestCard, {
			props: { test: objectTest, onView: mockOnView },
		});
		expect(getByTextObject("Object result")).toBeInTheDocument();

		// Test list result
		const listTest: GeneratedTest = {
			...mockTest,
			expected: { list: ["item1", "item2"], count: 2 },
		};
		const { getByText: getByTextList } = render(TestCard, {
			props: { test: listTest, onView: mockOnView },
		});
		expect(getByTextList("2 entries")).toBeInTheDocument();

		// Test value result
		const valueTest: GeneratedTest = {
			...mockTest,
			expected: { value: "test-value", count: 1 },
		};
		const { getByText: getByTextValue } = render(TestCard, {
			props: { test: valueTest, onView: mockOnView },
		});
		expect(getByTextValue("Value: test-value")).toBeInTheDocument();
	});

	it("has proper accessibility attributes", () => {
		const mockOnView = vi.fn();
		const { getByLabelText } = render(TestCard, {
			props: { test: mockTest, onView: mockOnView },
		});

		const card = getByLabelText("View test case: test-basic-parsing");
		expect(card).toHaveAttribute("aria-label");
		expect(card).toHaveAttribute("tabindex", "0");
		expect(card.getAttribute("aria-label")).toContain("test-basic-parsing");
	});

	it("truncates long input correctly", () => {
		const longInputTest: GeneratedTest = {
			...mockTest,
			input: "a".repeat(150), // Input longer than 100 characters
		};

		const mockOnView = vi.fn();
		const { container } = render(TestCard, {
			props: { test: longInputTest, onView: mockOnView },
		});

		const inputDisplay = container.querySelector('[role="code"]');
		expect(inputDisplay?.textContent).toMatch(/\.\.\.$/); // Should end with ellipsis
	});
});
