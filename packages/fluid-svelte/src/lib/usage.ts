import { SchemaFactory } from "fluid-framework";
import { Reactive } from "./Reactive.js";

const sf = new SchemaFactory("AppSchema");

export class MyDataClass extends sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
}) {
	@Reactive
	num!: number;

	@Reactive
	string!: string;
}

const instance = new MyDataClass({
  __num: 0,
  __string: "val",
});
