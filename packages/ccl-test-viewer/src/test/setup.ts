import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock SvelteKit modules
vi.mock("$app/environment", () => ({
	browser: true, // Set to true for client-side component testing
	dev: true,
	building: false,
	version: "test",
}));

vi.mock("$app/navigation", () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	beforeNavigate: vi.fn(),
	afterNavigate: vi.fn(),
	pushState: vi.fn(),
	replaceState: vi.fn(),
}));

vi.mock("$app/stores", () => ({
	page: {
		subscribe: vi.fn(() => () => {
			// Intentional empty unsubscribe function
		}),
	},
	navigating: {
		subscribe: vi.fn(() => () => {
			// Intentional empty unsubscribe function
		}),
	},
	updated: {
		subscribe: vi.fn(() => () => {
			// Intentional empty unsubscribe function
		}),
	},
}));

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver for virtual scrolling tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive component tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Setup global test data
vi.stubGlobal("testData", {
	categories: [],
	stats: {},
	searchIndex: [],
});
