export interface SailConfig {
	worker?: boolean;
	workerThreads?: boolean;
}

export const DefaultSailConfig: Required<SailConfig> = {
	worker: false,
	workerThreads: false,
};
