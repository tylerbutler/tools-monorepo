function format(values) {
	if (
		typeof values[0] === "string" &&
		values.length > 1 &&
		/%[sdifjoOc%]/.test(values[0])
	) {
		throw new TypeError("Formatted console output requires IPC.");
	}
	return (
		values
			.map((value) => {
				if (value instanceof Error) {
					const message = value.toString();
					const stack = value.stack ?? "";
					return stack.startsWith(message) ? stack : `${message}\n${stack}`;
				}
				if (value !== null && ["object", "function"].includes(typeof value)) {
					throw new TypeError("Console object inspection requires IPC.");
				}
				if (typeof value === "bigint") return `${value}n`;
				if (Object.is(value, -0)) return "-0";
				return String(value);
			})
			.join(" ") + "\n"
	);
}

if (typeof globalThis.console === "undefined") {
	const output = (...values) => {
		globalThis.process.stdout.write(format(values));
	};
	const error = (...values) => {
		globalThis.process.stderr.write(format(values));
	};
	globalThis.console = {
		log: output,
		info: output,
		debug: output,
		warn: error,
		error,
	};
}
