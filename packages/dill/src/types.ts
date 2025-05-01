// Exclude keys from an object at runtime
export function omit<T extends object, K extends keyof T>(
	obj: T,
	keys: K[],
): Omit<T, K> {
	const result = { ...obj };
	for (const key of keys) {
		delete result[key];
	}
	return result;
}
