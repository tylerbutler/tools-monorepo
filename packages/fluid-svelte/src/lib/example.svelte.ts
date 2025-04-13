import { SchemaFactory, Tree } from "fluid-framework";

export const sf = new SchemaFactory("AppSchema");

const ExampleSchema = sf.object("SchemaKey", {
	numVal: sf.number,
	stringVal: sf.string,
});

export class TreeData extends ExampleSchema {
	private _num = $state(this.numVal);
	public get num() {
		return this._num;
	}
	public set num(v: number) {
		this.numVal = v;
	}

	private _string = $state(this.stringVal);
	public get string() {
		return this._string;
	}
	public set string(v: string) {
		this.stringVal = v;
	}

	private refreshReactiveProperties(): void {
		this._num = this.numVal;
		this._string = this.stringVal;
	}

	#wireReactiveProperties = (() => {
		Tree.on(this, "nodeChanged", () => {
			this.refreshReactiveProperties();
		});
	})();
}
