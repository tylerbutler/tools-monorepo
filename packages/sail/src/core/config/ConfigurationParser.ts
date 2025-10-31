import type { SailPackageJson } from "../../common/npmPackage.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
import { isKnownMainExecutable } from "../executables.js";
import type {
	IConfigurationParser,
	IDependencyFilters,
	IDependencyValidators,
	IPackageConfiguration,
} from "../interfaces/index.js";
import type { TaskConfig, TaskDefinitions } from "../taskDefinitions.js";

export interface ParsedTaskConfig {
	name: string;
	config: TaskConfig;
}

/**
 * ConfigurationParser handles parsing and validation of task configurations
 * from package.json files and global task definitions.
 */
export class ConfigurationParser implements IConfigurationParser {
	/**
	 * Extracts package configuration from package.json
	 */
	public parsePackageConfiguration(
		json: SailPackageJson,
	): IPackageConfiguration {
		return {
			scripts: json.scripts ?? {},
			taskDefinitions: json.fluidBuild?.tasks,
		};
	}

	/**
	 * Validates task configuration and throws appropriate errors
	 */
	public validateTaskConfiguration(
		name: string,
		config: TaskConfig,
		packageScripts: Record<string, string | undefined>,
	): void {
		if (config.script) {
			this.validateScriptTask(name, config, packageScripts);
		} else {
			this.validateNonScriptTask(name, config);
		}
	}

	/**
	 * Creates filter functions for dependency validation
	 */
	public createDependencyFilters(
		globalTaskDefinitions: TaskDefinitions,
		packageScripts: Record<string, string | undefined>,
	): IDependencyFilters {
		const globalAllow = (value: string): boolean =>
			value.startsWith("^") ||
			(globalTaskDefinitions[value] !== undefined &&
				!globalTaskDefinitions[value].script) ||
			packageScripts[value] !== undefined;

		const globalAllowExpansionsStar = (value: string): boolean =>
			value === "*" || globalAllow(value);

		return {
			globalAllow,
			globalAllowExpansionsStar,
		};
	}

	/**
	 * Creates validation functions for task dependencies
	 */
	public createDependencyValidators(
		taskDefinitions: Record<string, TaskConfig>,
		packageScripts: Record<string, string | undefined>,
		isReleaseGroupRoot: boolean,
	): IDependencyValidators {
		if (isReleaseGroupRoot) {
			// For release group root, validation is relaxed
			return {
				invalidDependOn: () => false,
				invalidBefore: () => false,
				invalidAfter: () => false,
			};
		}

		const invalidDependOn = (value: string): boolean =>
			!(value.includes("#") || value.startsWith("^")) &&
			taskDefinitions[value] === undefined &&
			packageScripts[value] === undefined;

		const invalidBefore = (value: string): boolean =>
			value !== "*" && invalidDependOn(value);

		const invalidAfter = (value: string): boolean =>
			value !== "^*" && invalidBefore(value);

		return {
			invalidDependOn,
			invalidBefore,
			invalidAfter,
		};
	}

	private validateScriptTask(
		name: string,
		_config: TaskConfig,
		packageScripts: Record<string, string | undefined>,
	): void {
		const script = packageScripts[name];
		if (script === undefined) {
			throw ConfigurationError.missingScript(name);
		}

		if (isKnownMainExecutable(script)) {
			throw ConfigurationError.invalidTaskDefinition(
				name,
				"Script task should not invoke 'fluid-build'",
			);
		}
	}

	private validateNonScriptTask(name: string, config: TaskConfig): void {
		if (config.before.length > 0 || config.after.length > 0) {
			throw ConfigurationError.invalidTaskDefinition(
				name,
				"Non-script task definition cannot have 'before' or 'after'",
			);
		}
	}
}
