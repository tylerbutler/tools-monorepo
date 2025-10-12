import type { HTMLAttributes } from "svelte/elements";
import type { VariantProps } from "tailwind-variants";
import Root from "./alert.svelte";
import AlertDescription from "./alert-description.svelte";
import { alertVariants } from "./variants.js";

type Variant = VariantProps<typeof alertVariants>["variant"];
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type Props = HTMLAttributes<HTMLDivElement> & {
	variant?: Variant;
};

type TitleProps = HTMLAttributes<HTMLHeadingElement> & {
	level?: HeadingLevel;
};

type DescriptionProps = HTMLAttributes<HTMLDivElement>;

export {
	Root,
	AlertDescription,
	type Props,
	type TitleProps,
	type DescriptionProps,
	//
	Root as Alert,
	type Props as AlertProps,
	type TitleProps as AlertTitleProps,
	type DescriptionProps as AlertDescriptionProps,
	alertVariants,
};
