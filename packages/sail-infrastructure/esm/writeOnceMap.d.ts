/**
 * An error thrown when trying to update an element in a {@link WriteOnceMap} that has already been set.
 *
 * @beta
 */
export declare class KeyAlreadySet extends Error {
    /**
     * Create a new KeyAlreadySet error.
     *
     * @param key - The Map key that was already set.
     */
    constructor(key: string);
}
/**
 * A WriteOnceMap is a Map whose keys can only be written once. Once a key is set, subsequent attempts to update it will
 * throw a {@link KeyAlreadySet} error unless the `force` parameter is used.
 *
 * @typeParam K - type of the Map key.
 * @typeParam V - type of the Map value.
 *
 * @beta
 */
export declare class WriteOnceMap<K, V> extends Map<K, V> {
    /**
     * Adds a new element with a specified key and value to the Map. If an element with the same key already exists, a
     * {@link KeyAlreadySet} error will be thrown.
     *
     * @param key - The key to set.
     * @param value - The value to set.
     * @param force - Set to true to force a Map element to be updated whether it has previously been set or not.
     */
    set(key: K, value: V, force?: boolean): this;
}
//# sourceMappingURL=writeOnceMap.d.ts.map