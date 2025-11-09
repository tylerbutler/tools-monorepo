/** @type {import('@tylerbu/sail-infrastructure').BuildProjectConfigV2} */
module.exports = {
	version: 2,
	buildProject: {
		workspaces: {
			default: {
				directory: ".",
				releaseGroups: {
					test: {
						include: ["*"],
					},
				},
			},
		},
	},
};
