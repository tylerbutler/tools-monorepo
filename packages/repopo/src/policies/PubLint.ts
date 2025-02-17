import { dirname } from "pathe";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import type { PolicyFailure, RepoPolicy } from "../policy.js";
import { generatePackagePolicy } from "../policyGenerators/generatePackagePolicy.js";

export const PubLint: RepoPolicy = generatePackagePolicy(
	"PubLint",
	async (json, { file }) => {
		const { messages } = await publint({
			pkgDir: dirname(file),
		});

		if (messages.length === 0) {
			return true;
		}

		const formatted = messages.map((m) => formatMessage(m, json));

		const failResult: PolicyFailure = {
			name: PubLint.name,
			file,
			autoFixable: false,
			errorMessage: `PubLint found ${formatted.length} issues.\n\n${formatted.join("\n")}`,
		};

		return failResult;
	},
);
