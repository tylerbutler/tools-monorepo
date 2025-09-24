import type { HTMLAttributes } from "svelte/elements";
import Root from "./progress.svelte";

type Props = HTMLAttributes<HTMLDivElement> & {
	value?: number;
	max?: number;
};

export {
	Root,
	type Props,
	//
	Root as Progress,
	type Props as ProgressProps,
};
