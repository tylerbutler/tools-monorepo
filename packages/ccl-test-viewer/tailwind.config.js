import { fontFamily } from "tailwindcss/defaultTheme";
import { base16Tailwind } from "base16-tailwind";

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: [
		"dark",
		// Base16 theme classes
		"base16-tomorrow", "base16-one-light", "base16-github", "base16-solarized-light",
		"base16-tomorrow-night", "base16-monokai", "base16-dracula", "base16-nord",
		"base16-gruvbox-dark-hard", "base16-oceanicnext",
		// Base16 color classes
		"bg-100", "bg-200", "bg-300", "bg-400", "bg-500", "bg-600", "bg-700", "bg-800",
		"text-100", "text-200", "text-300", "text-400", "text-500", "text-600", "text-700", "text-800",
		"bg-red", "bg-orange", "bg-yellow", "bg-green", "bg-cyan", "bg-blue", "bg-purple", "bg-brown",
		"text-red", "text-orange", "text-yellow", "text-green", "text-cyan", "text-blue", "text-purple", "text-brown",
		"border-100", "border-200", "border-300", "border-400", "border-500", "border-600", "border-700", "border-800",
		"border-red", "border-orange", "border-yellow", "border-green", "border-cyan", "border-blue", "border-purple", "border-brown",
		// Hover states
		"hover:bg-100", "hover:bg-200", "hover:bg-300", "hover:bg-400", "hover:bg-500", "hover:bg-600", "hover:bg-700", "hover:bg-800",
		"hover:bg-red", "hover:bg-orange", "hover:bg-yellow", "hover:bg-green", "hover:bg-cyan", "hover:bg-blue", "hover:bg-purple", "hover:bg-brown"
	],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			fontFamily: {
				sans: [...fontFamily.sans],
				mono: ['"IBM Plex Mono"', ...fontFamily.mono],
			},
		},
	},
	plugins: [base16Tailwind()],
};

export default config;
