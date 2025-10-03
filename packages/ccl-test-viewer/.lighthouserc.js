module.exports = {
	ci: {
		collect: {
			staticDistDir: "./build",
			url: ["http://localhost/ccl-test-viewer/"],
		},
		upload: {
			target: "temporary-public-storage",
		},
	},
};
