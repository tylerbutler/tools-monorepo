import SortTsconfigCommand from "sort-tsconfig/command";

// biome-ignore lint/complexity/noStaticOnlyClass: necessary pattern
export default class SortTsconfig extends SortTsconfigCommand {
	static override readonly aliases = ["sort:tsconfigs"];
}
