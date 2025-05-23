module.exports = {
	inputs: ["./package.json"],
	output: "./THIRD-PARTY-LICENSES.txt",
	overwrite: true,
	eol: "lf",
	ci: true,
	noSpinner: true,
	exclude: ["@tylerbu/cli-api", "@tylerbu/fundamentals"],
	replace: {
		"@andrewbranch/untar.js@1.0.3":
			"https://raw.githubusercontent.com/antimatter15/untar.js/master/LICENSE",
	},
};
