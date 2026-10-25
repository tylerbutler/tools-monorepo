import { defineConfig, mergeConfig } from "vitest/config";
import defaultConfig from "../../config/vitest.config.ts";

export default mergeConfig(defaultConfig, defineConfig({}));
