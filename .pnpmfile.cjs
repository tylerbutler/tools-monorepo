module.exports = {
	hooks: {
		updateConfig(config) {
			// Set environment variable for Sharp during dependency installation
			process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = "1";
			return config;
		},
	},
};
