import type {
	ConfiguredFilePolicy,
	ConfiguredPolicy,
	ConfiguredRepositoryPolicy,
	FilePolicyDefinition,
	PolicyDefinition,
	PolicyInstanceId,
	PolicyName,
	PolicyOptions,
	RepositoryPolicyDefinition,
} from "./policy.js";

type ConfigOf<D> = D extends PolicyDefinition<infer C> ? C : never;
type OptionsFor<D> = D extends { requiresConfig: true }
	? D extends { defaultConfig: ConfigOf<D> }
		? [options?: PolicyOptions<ConfigOf<D>>]
		: [
				options: PolicyOptions<ConfigOf<D>> & {
					config: Exclude<ConfigOf<D>, undefined>;
				},
			]
	: [options?: PolicyOptions<ConfigOf<D>>];

/** Configure a file definition using a single options object. @public */
export function makePolicy<D extends FilePolicyDefinition<unknown>>(
	definition: D,
	...options: OptionsFor<D>
): ConfiguredFilePolicy<ConfigOf<D>>;
/** Configure a repository definition using a single options object. @public */
export function makePolicy<D extends RepositoryPolicyDefinition<unknown>>(
	definition: D,
	...options: OptionsFor<D>
): ConfiguredRepositoryPolicy<ConfigOf<D>>;
/** Configure a common-union definition without losing scope discrimination. @public */
export function makePolicy<D extends PolicyDefinition<unknown>>(
	definition: D,
	...options: OptionsFor<D>
): ConfiguredPolicy<ConfigOf<D>>;
export function makePolicy(
	definition: PolicyDefinition<unknown>,
	options?: PolicyOptions<unknown>,
	...extra: unknown[]
): ConfiguredPolicy<unknown> {
	const guidance =
		"Use makePolicy(definition, { config, exclude, instanceId }); positional config, third arguments and excludeFiles are no longer supported.";
	if (
		extra.length > 0 ||
		(options !== undefined &&
			(typeof options !== "object" ||
				options === null ||
				Array.isArray(options) ||
				Object.keys(options).some(
					(key) => !["config", "exclude", "instanceId"].includes(key),
				)))
	) {
		throw new TypeError(guidance);
	}
	if (
		options?.exclude !== undefined &&
		!(
			Array.isArray(options.exclude) &&
			options.exclude.every(
				(value) => typeof value === "string" || value instanceof RegExp,
			)
		)
	) {
		throw new TypeError(guidance);
	}
	if (
		options?.instanceId !== undefined &&
		(typeof options.instanceId !== "string" || options.instanceId.length === 0)
	) {
		throw new TypeError("instanceId must be a nonempty string.");
	}
	const config =
		options?.config === undefined ? definition.defaultConfig : options.config;
	if (definition.requiresConfig && config === undefined) {
		throw new TypeError(
			`Policy '${definition.name}' requires config. ${guidance}`,
		);
	}
	return { ...definition, ...options, config };
}

/** Assign stable IDs, rejecting ambiguous duplicates. @internal */
export function identifyPolicyInstances<
	T extends { name: PolicyName; instanceId?: PolicyInstanceId | undefined },
>(policies: readonly T[]): (T & { instanceId: PolicyInstanceId })[] {
	const names = new Map<string, number>();
	const ids = new Set<string>();
	for (const policy of policies) {
		names.set(policy.name, (names.get(policy.name) ?? 0) + 1);
		if (policy.instanceId !== undefined) {
			if (ids.has(policy.instanceId)) {
				throw new Error(`Duplicate policy instance ID: ${policy.instanceId}`);
			}
			ids.add(policy.instanceId);
		}
	}
	return policies.map((policy) => {
		if (policy.instanceId !== undefined) {
			return { ...policy, instanceId: policy.instanceId };
		}
		if ((names.get(policy.name) ?? 0) > 1) {
			throw new Error(
				`Policy '${policy.name}' is configured multiple times. Set a unique instanceId for each instance.`,
			);
		}
		if (ids.has(policy.name)) {
			throw new Error(
				`Policy instance ID '${policy.name}' conflicts with another configured policy. Set an explicit unique instanceId.`,
			);
		}
		ids.add(policy.name);
		return { ...policy, instanceId: policy.name };
	});
}
