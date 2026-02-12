/**
 * Node.js assert module shim for QuickJS runtime.
 */

function assert(value, message) {
	if (!value) {
		throw new Error(message ?? "Assertion failed");
	}
}

assert.ok = assert;

assert.equal = (actual, expected, message) => {
	if (actual != expected) {
		throw new Error(message ?? `Expected ${expected}, got ${actual}`);
	}
};

assert.strictEqual = (actual, expected, message) => {
	if (actual !== expected) {
		throw new Error(message ?? `Expected ${expected}, got ${actual}`);
	}
};

assert.notEqual = (actual, expected, message) => {
	if (actual == expected) {
		throw new Error(message ?? `Expected not ${expected}`);
	}
};

assert.notStrictEqual = (actual, expected, message) => {
	if (actual === expected) {
		throw new Error(message ?? `Expected not ${expected}`);
	}
};

assert.deepStrictEqual = (actual, expected, message) => {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(message ?? "Deep strict equal assertion failed");
	}
};

assert.throws = (fn, _errorOrMessage, message) => {
	try {
		fn();
		throw new Error(message ?? "Expected function to throw");
	} catch (_) {
		// Expected
	}
};

assert.doesNotThrow = (fn, _errorOrMessage, message) => {
	try {
		fn();
	} catch (err) {
		throw new Error(
			message ?? `Expected function not to throw, but threw: ${err.message}`,
		);
	}
};

assert.fail = (message) => {
	throw new Error(typeof message === "string" ? message : "Assertion failed");
};

// strict mode is the same as default in our shim
export const strict = assert;
export default assert;
