import { defineConfig } from "vite";

export default defineConfig({
	build: {
		outDir: "dist",
		sourcemap: true,
	},
	define: {
		// Pass environment variables to the app
		__VITE_LEVEE_HTTP_URL__: JSON.stringify(
			process.env.VITE_LEVEE_HTTP_URL ?? "http://localhost:4000",
		),
		__VITE_LEVEE_SOCKET_URL__: JSON.stringify(
			process.env.VITE_LEVEE_SOCKET_URL ?? "ws://localhost:4000/socket",
		),
		__VITE_LEVEE_TENANT_KEY__: JSON.stringify(
			process.env.VITE_LEVEE_TENANT_KEY ?? "dev-tenant-secret-key",
		),
	},
	server: {
		port: 3000,
		open: true,
	},
});
