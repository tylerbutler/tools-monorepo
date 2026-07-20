const WINDOWS_SEPARATOR = /\\/g;
const LINE_BREAK = /\r?\n/;

export function parseFilePaths(input: string): string[] {
	return input
		.replace(WINDOWS_SEPARATOR, "/")
		.split(LINE_BREAK)
		.filter((filePath) => filePath.length > 0);
}
