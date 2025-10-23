import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Helper type for element references
export type WithElementRef<T = Record<string, never>> = T & {
	ref?: HTMLElement | null | undefined;
};

// Helper type to exclude children/child props
export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;
