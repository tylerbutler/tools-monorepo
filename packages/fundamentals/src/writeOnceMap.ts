export class KeyAlreadySet extends Error {
	constructor(key: string) {
		super(`Key "${key}" is already set and cannot be modified.`);
		this.name = "KeyAlreadySet";
	}
}

export class WriteOnceMap<K, V> extends Map<K, V> {
	public override set(key: K, value: V, force = false) {
		if (this.has(key)) {
			if (!force) {
				throw new KeyAlreadySet(String(key));
			}
			// Setting the key anyway because of force.
			console.debug(`Force setting key: ${key}`);
		}
		return super.set(key, value);
	}
}
