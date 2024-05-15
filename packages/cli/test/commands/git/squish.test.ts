import { expect, test } from "@oclif/test";
import { describe } from "mocha";

describe("dummy tests", () => {
	test.it("dummy test 1", (_ctx) => {
		expect(1).to.eql(1);
	});
});
