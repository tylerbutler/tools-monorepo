const pkgJson = require("markdown-magic-package-json");
// const depTable = require("markdown-magic markdown-magic-dependency-table");

/* CLI markdown.config.js file example */
module.exports = {
	matchWord: "AUTO-GENERATED-CONTENT",
	transforms: {
		/* Match <!-- AUTO-GENERATED-CONTENT:START (PKGJSON) --> */
		PKGJSON: pkgJson(),
		// DEPENDENCYTABLE: depTable(),
	},
	callback: function () {
		console.log("markdown processing done");
	},
};
