const WINDOWS_SEPARATOR = /\\/g;
const LINE_BREAK = /\r?\n/;

export function parseFilePaths(input: string): string[] {
	return input
		.replace(WINDOWS_SEPARATOR, "/")
		.split(input.includes("\0") ? "\0" : LINE_BREAK)
		.filter((filePath) => filePath.length > 0);
}
