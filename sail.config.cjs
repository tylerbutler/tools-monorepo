/**
 * Sail configuration for tools-monorepo
 *
 * This configuration enables Sail to build the monorepo for benchmarking purposes.
 * The primary build system is Nx; this config allows comparison testing.
 *
 * @type {import('@tylerbu/sail').ISailConfig}
 */
module.exports = {
	version: 1,
	tasks: {
		// Build task with dependency ordering
		build: {
			dependsOn: ["^build"],
			script: true,
		},
		// Compile TypeScript (most packages have this)
		"build:compile": {
			dependsOn: ["^build"],
			script: true,
		},
		// Clean build artifacts
		clean: {
			script: true,
		},
		// Test tasks
		test: {
			dependsOn: ["^build", "build"],
			script: true,
		},
	},
};
