/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_LEVEE_HTTP_URL?: string;
	readonly VITE_LEVEE_SOCKET_URL?: string;
	readonly VITE_LEVEE_TENANT_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
