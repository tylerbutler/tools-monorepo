import { defineConfig, mergeConfig } from "vitest/config";

import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(defaultConfig, defineConfig({}));

export default config;
