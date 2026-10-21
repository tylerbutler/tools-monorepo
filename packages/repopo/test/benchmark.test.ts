import { describe, expect, it } from "vitest";

const { measure, runRounds, summarize } = await import(
	new URL("../scripts/benchmark.mjs", import.meta.url).href
);

describe("Benchmark harness", () => {
	it("rejects failed commands with their diagnostic output", async () => {
		await expect(
			measure(
				[
					process.execPath,
					"-e",
					'console.error("broken config"); process.exit(1)',
				],
				process.cwd(),
			),
		).rejects.toThrow(/exited with 1\nbroken config/);
	});

	it("transfers stdin without a shell and captures stdout", async () => {
		const result = await measure(
			[process.execPath, "-e", "process.stdin.pipe(process.stdout)"],
			process.cwd(),
			"file with spaces.ts\n",
		);
		expect(result.stdout).toBe("file with spaces.ts\n");
	});

	it("runs every case once per round and excludes warmups", async () => {
		const cases = ["first", "second"].map((engine) => ({
			scenario: "empty",
			engine,
			command: [process.execPath, "-e", ""],
			input: "",
		}));
		const samples = await runRounds(cases, {
			cwd: process.cwd(),
			warmup: 1,
			runs: 2,
		});
		expect(samples).toHaveLength(4);
		for (const round of [0, 1]) {
			const entries = samples.filter((sample) => sample.round === round);
			expect(entries.map((sample) => sample.engine).sort()).toEqual([
				"first",
				"second",
			]);
			expect(entries.map((sample) => sample.order)).toEqual([0, 1]);
		}
	});

	it("reports the median and spread without dropping outliers", () => {
		expect(summarize([100, 10, 20, 30])).toMatchObject({
			median: 25,
			mean: 40,
			p25: 17.5,
			p75: 47.5,
			min: 10,
			max: 100,
		});
		expect(summarize([10]).stddev).toBe(0);
		expect(() => summarize([])).toThrow("empty sample");
	});
});
