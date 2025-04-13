import { Tree } from "fluid-framework";
import { sf } from "./factory.js";

// #region Types

export type RemoveDoubleUnderscore<T extends string> = T extends `__${infer U}`
	? U
	: T;

export type SchemaToInterface<T> = {
	[K in keyof T as K extends `__${string}`
		? RemoveDoubleUnderscore<K & string>
		: never]: T[K];
};

export type ReactiveInterface<T extends abstract new (...args: any) => any> =
	SchemaToInterface<InstanceType<T>>;

type PropertyDecorator = (target: object, propertyKey: string | symbol) => void;

// #endregion

// #region Decorator

export const Reactive: PropertyDecorator = (
	target: object,
	propertyKey: string | symbol,
) => {
	// Create a private field to store the reactive state
	const privateKey = `#${String(propertyKey)}`;
	const fluidKey = `__${String(propertyKey)}`;

	// Define the getter and setter
	Object.defineProperty(target, propertyKey, {
		get() {
			if (!this[privateKey]) {
				this[privateKey] = $state(this[fluidKey]);

				Tree.on(this, "nodeChanged", () => {
					this[privateKey] = this[fluidKey];
				});
			}
			return this[privateKey];
		},
		set(value: unknown) {
			this[fluidKey] = value;
		},
	});
};

// #endregion

// #region Define persisted schema

/**
 * The first step of the pattern is to create a schema class using the schema factory. The data here is persisted in the
 * SharedTree. None of these properties are reactive, though.
 *
 * The schema properties defined here must be prefixed with two underscores (`__`). Otherwise the data will not be wired
 * to reactive properties correctly.
 */

const persistedChildObject = sf.object("ChildObject", {
	__name: sf.string,
	__id: sf.number,
});

const persistedDataSchema = sf.object("ExampleData", {
	__num: sf.number,
	__string: sf.string,
	__bool: sf.boolean,
	__children: sf.array(persistedChildObject),
	// __arrNum: sf.array(sf.number),
	// __arrString: sf.array(sf.string),
});

// #endregion

// #region Create reactive type

/**
 * These types contains only reactive properties. They hide the backing persisted propeties. These types should be the
 * primary type that is used for the data, especially in views.
 */

type ReactiveChild = ReactiveInterface<typeof persistedChildObject>;
type ReactiveDataInterface = ReactiveInterface<typeof persistedDataSchema>;

// #endregion

// #region Reactive classes

export class ChildClass extends persistedChildObject implements ReactiveChild {
	@Reactive
	name!: string;

	@Reactive
	id!: number;
}

export class MyDataClass
	extends persistedDataSchema
	implements ReactiveDataInterface
{
	@Reactive
	num!: number;

	@Reactive
	string!: string;

	@Reactive
	bool!: boolean;

	@Reactive
	children!: ChildClass[];

	// @Reactive
	// arrNum!: number[];

	// @Reactive
	// arrString!: string[];

	// @Reactive
	// foo!: boolean;
}

// #endregion

// #region Using the reactive class

const instance: ReactiveDataInterface = new MyDataClass({
	__num: 0,
	__string: "val",
	__bool: false,
	__children: [
		new ChildClass({
			__id: 1,
			__name: "name",
		}),
	],
	// __arrNum: [0, 1, 2],
	// __arrString: ["a", "b", "c"],
});

instance.num;

// #endregion
