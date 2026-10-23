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
	if (actual != expected && !(Number.isNaN(actual) && Number.isNaN(expected))) {
		throw new Error(message ?? `Expected ${expected}, got ${actual}`);
	}
};

assert.strictEqual = (actual, expected, message) => {
	if (!Object.is(actual, expected)) {
		throw new Error(message ?? `Expected ${expected}, got ${actual}`);
	}
};

assert.notEqual = (actual, expected, message) => {
	if (actual == expected || (Number.isNaN(actual) && Number.isNaN(expected))) {
		throw new Error(message ?? `Expected not ${expected}`);
	}
};

assert.notStrictEqual = (actual, expected, message) => {
	if (Object.is(actual, expected)) {
		throw new Error(message ?? `Expected not ${expected}`);
	}
};

assert.deepStrictEqual = () => {
	throw new Error("Deep assertions require IPC.");
};

assert.throws = (fn, errorOrMessage, message) => {
	if (typeof errorOrMessage !== "string" && errorOrMessage !== undefined) {
		throw new Error("Assertion error matching requires IPC.");
	}
	let threw = false;
	try {
		fn();
	} catch (_) {
		threw = true;
	}
	if (!threw)
		throw new Error(message ?? errorOrMessage ?? "Expected function to throw");
};

assert.doesNotThrow = (fn, errorOrMessage, message) => {
	if (typeof errorOrMessage !== "string" && errorOrMessage !== undefined) {
		throw new Error("Assertion error matching requires IPC.");
	}
	try {
		fn();
	} catch (err) {
		throw new Error(
			message ??
				errorOrMessage ??
				`Expected function not to throw, but threw: ${err.message}`,
		);
	}
};

assert.fail = (message) => {
	throw new Error(typeof message === "string" ? message : "Assertion failed");
};

export const strict = Object.assign(
	(value, message) => assert(value, message),
	assert,
	{ equal: assert.strictEqual, notEqual: assert.notStrictEqual },
);
strict.strict = strict;
assert.strict = strict;
export default assert;
