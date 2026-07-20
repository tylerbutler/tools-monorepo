const lineBreakRegex = /\r?\n/;

export function normalizeFilePathInput(input: string): string[] {
	return input
		.replace(
			// normalize slashes in case they're windows paths
			/\\/g,
			"/",
		)
		.split(lineBreakRegex)
		.filter((filePath) => filePath !== "");
}
