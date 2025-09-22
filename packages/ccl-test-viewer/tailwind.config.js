import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
const config = {
	darkMode: ["class"],
	content: ["./src/**/*.{html,js,svelte,ts}"],
	safelist: ["dark"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				border: "hsl(var(--border) / <alpha-value>)",
				input: "hsl(var(--input) / <alpha-value>)",
				ring: "hsl(var(--ring) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				foreground: "hsl(var(--foreground) / <alpha-value>)",
				primary: {
					DEFAULT: "hsl(var(--primary) / <alpha-value>)",
					foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
					foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
					foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
				},
				muted: {
					DEFAULT: "hsl(var(--muted) / <alpha-value>)",
					foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
				},
				accent: {
					DEFAULT: "hsl(var(--accent) / <alpha-value>)",
					foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
				},
				popover: {
					DEFAULT: "hsl(var(--popover) / <alpha-value>)",
					foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
				},
				card: {
					DEFAULT: "hsl(var(--card) / <alpha-value>)",
					foreground: "hsl(var(--card-foreground) / <alpha-value>)",
				},
				// Extended colorful palette
				success: {
					DEFAULT: "hsl(var(--success) / <alpha-value>)",
					foreground: "hsl(var(--success-foreground) / <alpha-value>)",
				},
				warning: {
					DEFAULT: "hsl(var(--warning) / <alpha-value>)",
					foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
				},
				info: {
					DEFAULT: "hsl(var(--info) / <alpha-value>)",
					foreground: "hsl(var(--info-foreground) / <alpha-value>)",
				},
				purple: {
					DEFAULT: "hsl(var(--purple) / <alpha-value>)",
					foreground: "hsl(var(--purple-foreground) / <alpha-value>)",
				},
				pink: {
					DEFAULT: "hsl(var(--pink) / <alpha-value>)",
					foreground: "hsl(var(--pink-foreground) / <alpha-value>)",
				},
				indigo: {
					DEFAULT: "hsl(var(--indigo) / <alpha-value>)",
					foreground: "hsl(var(--indigo-foreground) / <alpha-value>)",
				},
				cyan: {
					DEFAULT: "hsl(var(--cyan) / <alpha-value>)",
					foreground: "hsl(var(--cyan-foreground) / <alpha-value>)",
				},
				lime: {
					DEFAULT: "hsl(var(--lime) / <alpha-value>)",
					foreground: "hsl(var(--lime-foreground) / <alpha-value>)",
				},
				amber: {
					DEFAULT: "hsl(var(--amber) / <alpha-value>)",
					foreground: "hsl(var(--amber-foreground) / <alpha-value>)",
				},
				emerald: {
					DEFAULT: "hsl(var(--emerald) / <alpha-value>)",
					foreground: "hsl(var(--emerald-foreground) / <alpha-value>)",
				},
				rose: {
					DEFAULT: "hsl(var(--rose) / <alpha-value>)",
					foreground: "hsl(var(--rose-foreground) / <alpha-value>)",
				},
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			fontFamily: {
				sans: [...fontFamily.sans],
				mono: ['"IBM Plex Mono"', ...fontFamily.mono],
			},
		},
	},
	plugins: [],
};

export default config;
