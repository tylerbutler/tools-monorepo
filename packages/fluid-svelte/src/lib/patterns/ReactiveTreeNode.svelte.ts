import type { SchemaToInterface } from "$lib/types.js";
import { SchemaFactory, Tree } from "fluid-framework";

export const sf = new SchemaFactory("AppSchema");

const ExampleTreeLeaf = sf.object("LeafKey", {
	__num: sf.number,
	__string: sf.string,
});

const ExampleTree = sf.object("TreeKey", {
	__leaf: ExampleTreeLeaf,
});

export type LeafData = SchemaToInterface<InstanceType<typeof ExampleTreeLeaf>>;

export type TreeData = SchemaToInterface<InstanceType<typeof ExampleTree>>;

export class LeafDataClass extends ExampleTreeLeaf implements LeafData {
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

const instance = new LeafDataClass({
	__num: 0,
	__string: "str",
});

instance.num = 1;
