import type { HTMLAttributes } from "svelte/elements";
import { tv, type VariantProps } from "tailwind-variants";
import Root from "./alert.svelte";
import AlertDescription from "./alert-description.svelte";

const alertVariants = tv({
	base: "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
	variants: {
		variant: {
			default: "bg-background text-foreground",
			destructive:
				"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

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
