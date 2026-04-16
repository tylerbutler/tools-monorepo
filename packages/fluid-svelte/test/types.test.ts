import { describe, expectTypeOf, it } from "vitest";

import type {
	RemovePrefix,
	RequireDoubleUnderscore,
	SchemaToInterface,
} from "../src/lib/types.js";

describe("RemovePrefix", () => {
	it("should strip the __ prefix from strings", () => {
		expectTypeOf<RemovePrefix<"__foo">>().toEqualTypeOf<"foo">();
		expectTypeOf<RemovePrefix<"__bar">>().toEqualTypeOf<"bar">();
		expectTypeOf<RemovePrefix<"__a">>().toEqualTypeOf<"a">();
	});

	it("should leave strings without __ prefix unchanged", () => {
		expectTypeOf<RemovePrefix<"foo">>().toEqualTypeOf<"foo">();
		expectTypeOf<RemovePrefix<"bar">>().toEqualTypeOf<"bar">();
	});

	it("should handle single underscore prefix (no strip)", () => {
		expectTypeOf<RemovePrefix<"_foo">>().toEqualTypeOf<"_foo">();
	});

	it("should handle empty suffix after __", () => {
		expectTypeOf<RemovePrefix<"__">>().toEqualTypeOf<"">();
	});
});

describe("RequireDoubleUnderscore", () => {
	it("should resolve to never for strings starting with __", () => {
		expectTypeOf<RequireDoubleUnderscore<"__foo">>().toBeNever();
		expectTypeOf<RequireDoubleUnderscore<"__bar">>().toBeNever();
	});

	it("should pass through strings not starting with __", () => {
		expectTypeOf<RequireDoubleUnderscore<"foo">>().toEqualTypeOf<"foo">();
		expectTypeOf<RequireDoubleUnderscore<"bar">>().toEqualTypeOf<"bar">();
	});

	it("should pass through single underscore strings", () => {
		expectTypeOf<RequireDoubleUnderscore<"_foo">>().toEqualTypeOf<"_foo">();
	});
});

describe("SchemaToInterface", () => {
	it("should include only __ prefixed keys with prefix stripped", () => {
		type Input = {
			__num: number;
			__str: string;
			other: boolean;
		};
		type Expected = { num: number; str: string };

		expectTypeOf<SchemaToInterface<Input>>().toEqualTypeOf<Expected>();
	});

	it("should return empty object when no __ prefixed keys exist", () => {
		type Input = { foo: string; bar: number };
		// biome-ignore lint/complexity/noBannedTypes: intentional empty object type for testing
		type Expected = {};

		expectTypeOf<SchemaToInterface<Input>>().toEqualTypeOf<Expected>();
	});

	it("should handle all __ prefixed keys", () => {
		type Input = { __a: string; __b: number; __c: boolean };
		type Expected = { a: string; b: number; c: boolean };

		expectTypeOf<SchemaToInterface<Input>>().toEqualTypeOf<Expected>();
	});

	it("should preserve value types", () => {
		type Input = {
			__arr: string[];
			__nested: { inner: number };
			__optional: string | undefined;
		};
		type Expected = {
			arr: string[];
			nested: { inner: number };
			optional: string | undefined;
		};

		expectTypeOf<SchemaToInterface<Input>>().toEqualTypeOf<Expected>();
	});
});
