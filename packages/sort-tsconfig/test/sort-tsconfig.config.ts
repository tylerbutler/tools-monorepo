import {
	defaultSortOrder,
	type SortTsconfigConfiguration,
} from "sort-tsconfig";

const config: SortTsconfigConfiguration = {
	order: defaultSortOrder,
};

// biome-ignore lint/style/noDefaultExport: correct pattern for config files
export default config;
