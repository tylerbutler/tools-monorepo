import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";

function executeGitCommand(command, args) {
	return new Promise((resolve, reject) => {
		execFile("git", [command, ...args], (error, stdout, stderr) => {
			if (error) {
				reject(`error: ${error.message}`);
				return;
			}
			if (stderr) {
				reject(`stderr: ${stderr}`);
				return;
			}
			resolve(stdout.trim());
		});
	});
}

async function loadConfiguredEmail() {
	try {
		const file = await readFile(".require-email.json", { encoding: "utf8" });
		const config = JSON.parse(file);
		if (config.email === undefined) {
			throw new Error("Email is not defined in .require-email.json");
		}
		return config.email;
	} catch (error) {
		console.error(
			`Error loading .require-email.json. Create the file if it doesn't exist. Error: ${error}`,
		);
		process.exit(1);
	}
}

async function checkEmailConfig() {
	try {
		const configuredEmail = await loadConfiguredEmail();
		const email = await executeGitCommand("config", ["user.email"]);
		if (email !== configuredEmail) {
			console.error(
				`Email '${email}' does not match configured email '${configuredEmail}'`,
			);
			process.exit(1);
		}
	} catch (error) {
		console.error(error);
	}
}

checkEmailConfig();
