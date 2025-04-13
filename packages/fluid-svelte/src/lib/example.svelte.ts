import { SchemaFactory, Tree } from "fluid-framework";

export const sf = new SchemaFactory("AppSchema");

const ExampleSchema = sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
});

export class MyDataClass extends ExampleSchema {
	#num = $state(this.__num);
	#string = $state(this.__string);

	// Clean getters/setters that maintain reactivity
	get num() { return this.#num; }
	set num(v: number) { 
		this.__num = v;
	}

	get string() { return this.#string; }
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
