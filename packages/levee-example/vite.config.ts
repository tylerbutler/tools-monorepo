import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "dist",
		sourcemap: true,
		target: "esnext",
	},
	server: {
		port: 3000,
		host: true,
	},
	define: {
		// Environment variables for Levee server configuration
		"import.meta.env.VITE_LEVEE_HTTP_URL": JSON.stringify(
			process.env.VITE_LEVEE_HTTP_URL ?? "http://localhost:4000",
		),
		"import.meta.env.VITE_LEVEE_SOCKET_URL": JSON.stringify(
			process.env.VITE_LEVEE_SOCKET_URL ?? "ws://localhost:4000/socket",
		),
		"import.meta.env.VITE_LEVEE_TENANT_KEY": JSON.stringify(
			process.env.VITE_LEVEE_TENANT_KEY ?? "dev-tenant-secret-key",
		),
	},
});
