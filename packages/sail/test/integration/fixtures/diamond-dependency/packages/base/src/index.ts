export interface BaseConfig {
	name: string;
	version: string;
}

export function createConfig(name: string): BaseConfig {
	return { name, version: "1.0.0" };
}
