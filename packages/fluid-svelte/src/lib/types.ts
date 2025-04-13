export type RemoveDoubleUnderscore<T extends string> = T extends `__${infer U}`
	? U
	: T;

export type SchemaToInterface<T> = {
	[K in keyof T as K extends `__${string}`
		? RemoveDoubleUnderscore<K & string>
		: never]: T[K];
};

export type ReactiveInterface<T extends abstract new (...args: any) => any> = SchemaToInterface<InstanceType<T>>