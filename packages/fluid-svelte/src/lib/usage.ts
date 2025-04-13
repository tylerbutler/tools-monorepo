import { SchemaFactory } from "fluid-framework";

const sf = new SchemaFactory("AppSchema");

export class MyDataClass extends sf.object("SchemaKey", {
	__num: sf.number,
	__string: sf.string,
}) {
	@Reactive("__num")
	num!: number;

	@Reactive("__string")
	string!: string;
}
