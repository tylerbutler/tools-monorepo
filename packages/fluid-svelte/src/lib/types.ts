import type { RestrictiveStringRecord } from "fluid-framework";

export type RequireDoubleUnderscore<T extends string> = T extends `__${string}`
	? never
	: T;

export type UnderscoreStringRecord<T extends string> = RestrictiveStringRecord<
	RequireDoubleUnderscore<T>
>;

export type RemovePrefix<T extends string> = T extends `__${infer U}` ? U : T;

export type SchemaToInterface<T> = {
	[K in keyof T as K extends `__${string}`
		? RemovePrefix<K & string>
		: never]: T[K];
};
