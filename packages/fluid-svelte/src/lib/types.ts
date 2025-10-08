import type { RestrictiveStringRecord } from "fluid-framework";

export type RequireDoubleUnderscore<T extends string> = T extends `__${string}`
	? never
	: T;

export type UnderscoreStringRecord<T extends string> = RestrictiveStringRecord<
	RequireDoubleUnderscore<T>
>;
