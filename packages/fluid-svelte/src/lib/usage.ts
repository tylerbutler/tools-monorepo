import { SchemaFactory } from "fluid-framework";
import { Reactive } from "./Reactive.js";
import type { ReactiveInterface } from "./types.js";

const sf = new SchemaFactory("AppSchema");

const classSchema = sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
	__bool: sf.boolean,
});

type ReactiveClass = ReactiveInterface<typeof classSchema>;

export class MyDataClass extends classSchema implements ReactiveClass {
	@Reactive
	num!: number;

	@Reactive
	string!: string;

	@Reactive
	bool!: boolean;

	@Reactive
	foo!: boolean;
}

const instance = new MyDataClass({
	__num: 0,
	__string: "val",
	__bool: false,
});

instance.num;
