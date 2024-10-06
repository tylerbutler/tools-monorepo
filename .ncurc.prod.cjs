const base = require("./.ncurc.cjs");

// @ts-check

/** @type {import("npm-check-updates").RunOptions} */
const config = {
	...base,
	dep: ["prod"],

	// 	/** Filter out non-major version updates.
	//   @param {string} packageName        The name of the dependency.
	//   @param {string} current            Current version declaration (may be a range).
	//   @param {SemVer[]} currentSemver    Current version declaration in semantic versioning format (may be a range).
	//   @param {string} upgraded           Upgraded version.
	//   @param {SemVer} upgradedSemver     Upgraded version in semantic versioning format.
	//   @returns {boolean}                 Return true if the upgrade should be kept, otherwise it will be ignored.
	// */
	// 	filterResults: (
	// 		packageName,
	// 		{ current, currentSemver, upgraded, upgradedSemver },
	// 	) => {
	// 		const currentMajor = parseInt(currentSemver[0]?.major, 10);
	// 		const upgradedMajor = parseInt(upgradedSemver?.major, 10);
	// 		if (currentMajor && upgradedMajor) {
	// 			return currentMajor < upgradedMajor;
	// 		}
	// 		return true;
	// 	},
};

module.exports = config;
