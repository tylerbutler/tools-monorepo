import { SchemaFactory } from "fluid-framework";
import { Reactive } from "./Reactive.js";

const sf = new SchemaFactory("AppSchema");

export class MyDataClass extends sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
	__bool: sf.boolean,
}) {
	@Reactive
	num!: number;

	@Reactive
	string!: string;

	@Reactive
	bool!: boolean;
}

const instance = new MyDataClass({
	__num: 0,
	__string: "val",
	__bool: false,
});

instance.num;
