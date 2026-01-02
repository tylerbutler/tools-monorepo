/**
 * Vitest setup file for CCL test runner.
 *
 * This file extends vitest's expect with custom CCL matchers.
 * It is automatically loaded via vitest.config.ts setupFiles.
 */

import { expect } from "vitest";
import { cclMatchers } from "../src/vitest-matchers.js";

// Extend vitest's expect with CCL custom matchers
expect.extend(cclMatchers);
