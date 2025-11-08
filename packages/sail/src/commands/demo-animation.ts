import { Command, Flags } from "@oclif/core";
import colors from "picocolors";
import { SailAnimation } from "../core/execution/SailAnimation.js";

export default class DemoAnimationCommand extends Command {
	public static override readonly description =
		"Demo the sailing animation. Press Ctrl+C to exit.";

	public static override readonly examples = [
		{
			description: "Run the animation demo",
			command: "<%= config.bin %> <%= command.id %>",
		},
		{
			description: "Run demo for 5 seconds",
			command: "<%= config.bin %> <%= command.id %> --duration 5",
		},
		{
			description: "Run demo with custom message",
			command:
				'<%= config.bin %> <%= command.id %> --message "Building your project..."',
		},
	];

	public static override readonly flags = {
		duration: Flags.integer({
			char: "d",
			description: "Duration in seconds (default: runs until Ctrl+C)",
			required: false,
		}),
		message: Flags.string({
			char: "m",
			description: "Custom message to display",
			default: "⛵ Sail is building your project...",
		}),
	} as const;

	public async run(): Promise<void> {
		const { flags } = await this.parse(DemoAnimationCommand);

		const animation = new SailAnimation();

		this.log(
			colors.bold(
				`\nStarting sailing animation demo... ${colors.dim("(Press Ctrl+C to exit)")}\n`,
			),
		);

		// Messages to cycle through if no custom message
		const defaultMessages = [
			"⛵ Sail is building your project...",
			"🔨 Compiling TypeScript...",
			"📦 Bundling packages...",
			"✨ Running optimizations...",
			"🎯 Almost there...",
			"🚀 Finalizing build...",
		];

		// Start animation
		animation.start(flags.message);

		// If using default message, cycle through different build messages
		let messageIndex = 0;
		let messageInterval: NodeJS.Timeout | undefined;

		if (flags.message === "⛵ Sail is building your project...") {
			messageInterval = setInterval(() => {
				messageIndex = (messageIndex + 1) % defaultMessages.length;
				animation.updateMessage(defaultMessages[messageIndex]);
			}, 2000);
		}

		// Handle duration or run indefinitely
		const duration = flags.duration;
		if (duration !== undefined) {
			await new Promise<void>((resolve) => {
				setTimeout(() => {
					if (messageInterval) {
						clearInterval(messageInterval);
					}
					animation.done("✅ Build complete! Smooth sailing ahead.");

					// Show final message for 2 seconds
					setTimeout(() => {
						resolve();
					}, 2000);
				}, duration * 1000);
			});
		} else {
			// Run until Ctrl+C
			await new Promise<void>((resolve) => {
				process.on("SIGINT", () => {
					if (messageInterval) {
						clearInterval(messageInterval);
					}
					animation.done(
						`\n${colors.yellow("⚠ Interrupted")} - Animation stopped.`,
					);
					setTimeout(() => {
						resolve();
					}, 500);
				});
			});
		}
	}
}
