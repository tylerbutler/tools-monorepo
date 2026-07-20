export function parseFilePaths(input: string): string[] {
	return input
		.replace(/\\/g, "/")
		.split(/\r?\n/)
		.filter((filePath) => filePath.length > 0);
}
