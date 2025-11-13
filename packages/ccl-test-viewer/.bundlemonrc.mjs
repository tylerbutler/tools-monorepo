export default {
	baseDir: "./build",
	// Use groups instead of individual files to avoid content-hash rename noise
	groups: [
		{
			name: "JavaScript",
			path: "_app/**/*.js",
			maxSize: "500kb",
			maxPercentIncrease: 10,
		},
		{
			name: "CSS",
			path: "_app/**/*.css",
			maxSize: "100kb",
			maxPercentIncrease: 10,
		},
		{
			name: "Chunks",
			path: "_app/immutable/chunks/*.js",
			maxSize: "200kb",
			maxPercentIncrease: 5,
		},
	],
	reportOutput: ["github", "console"],
	verbose: true,
	// GitHub App integration settings
	github: {
		checkRun: true, // Create GitHub check runs
		commitStatus: true, // Post commit status
		prComment: true, // Add detailed PR comments
	},
};
