import { SchemaFactory, Tree } from "fluid-framework";

export const sf = new SchemaFactory("AppSchema");

const ExampleSchema = sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
});

type RemovePrefix<T extends string> = T extends `__${infer U}` ? U : T;
type SchemaToInterface<T> = {
	[K in keyof T as K extends `__${string}`
		? RemovePrefix<K & string>
		: never]: T[K];
};

export type MyData = SchemaToInterface<typeof ExampleSchema>;

export class MyDataClass extends ExampleSchema implements MyData {
	#num = $state(this.__num);
	#string = $state(this.__string);

	// Clean getters/setters that maintain reactivity
	get num() {
		return this.#num;
	}
	set num(v: number) {
		this.__num = v;
	}

	get string() {
		return this.#string;
	}
	set string(v: string) {
		this.__string = v;
	}

	// Initialize reactivity
	#wireReactiveProperties = (() => {
		Tree.on(this, "nodeChanged", () => {
			this.#num = this.__num;
			this.#string = this.__string;
		});
	})();
}

const instance = new MyDataClass({
	__num: 0,
	__string: "str",
});

instance.num = 1;
