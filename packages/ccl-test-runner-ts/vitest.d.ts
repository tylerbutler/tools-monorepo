/**
 * Type declarations for CCL custom vitest matchers.
 *
 * This file extends vitest's Matchers interface to include
 * the custom CCL matchers with full TypeScript support.
 *
 * For Vitest 3.2.0+, we extend the Matchers interface.
 * @see https://vitest.dev/guide/extending-matchers.html
 */

import "vitest";
import type { Entry } from "./src/types.js";

declare module "vitest" {
	// Vitest 3.2.0+ uses Matchers interface
	interface Matchers<T = unknown> {
		/**
		 * Assert that a CCL test result passed.
		 * Provides detailed error messages for debugging.
		 */
		toPassCCLTest(): T;

		/**
		 * Assert that CCL parse output has the expected entry count.
		 */
		toHaveCCLEntryCount(count: number): T;

		/**
		 * Assert that CCL parse output matches expected entries.
		 */
		toMatchCCLEntries(entries: Entry[]): T;

		/**
		 * Assert that CCL hierarchy output matches expected object.
		 */
		toMatchCCLObject(object: unknown): T;
	}
}
