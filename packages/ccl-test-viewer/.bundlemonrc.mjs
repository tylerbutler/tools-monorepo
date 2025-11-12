export default {
	baseDir: "./build",
	files: [
		{
			path: "_app/**/*.js",
			maxSize: "500kb",
			maxPercentIncrease: 10,
		},
		{
			path: "_app/**/*.css",
			maxSize: "100kb",
			maxPercentIncrease: 10,
		},
		{
			path: "_app/immutable/chunks/*.js",
			maxSize: "200kb",
			maxPercentIncrease: 5,
		},
	],
	groups: [
		{
			name: "JavaScript",
			path: "_app/**/*.js",
		},
		{
			name: "CSS",
			path: "_app/**/*.css",
		},
	],
	reportOutput: ["github", "console"],
	verbose: true,
};
