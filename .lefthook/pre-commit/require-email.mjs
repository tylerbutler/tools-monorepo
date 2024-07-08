import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";

// Function to execute a git command using child_process
function executeGitCommand(command) {
	return new Promise((resolve, reject) => {
		exec(`git ${command}`, (error, stdout, stderr) => {
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
    console.log(`process.cwd() = ${process.cwd()}`);
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
		const email = await executeGitCommand("config user.email");
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

// Call the function to display the git config name and email
checkEmailConfig();
