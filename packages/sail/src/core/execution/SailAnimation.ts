import logUpdate from "log-update";
import pc from "picocolors";

/**
 * Frame-based sailing boat animation for the terminal using Unicode block elements.
 * Creates an animated sailing boat that moves across the screen with wave effects.
 */
export class SailAnimation {
	private frameIndex = 0;
	private frames: string[];
	private intervalId?: NodeJS.Timeout;
	private isRunning = false;

	public constructor() {
		this.frames = this.createFrames();
	}

	/**
	 * Creates animation frames showing a sailing boat moving across water.
	 * Uses Unicode block elements and shading for a modern look.
	 * Each frame slightly shifts the boat position and animates the waves.
	 */
	private createFrames(): string[] {
		// Sailing boat using Unicode block elements
		// ░ = light shade, ▒ = medium shade, ▓ = dark shade, █ = full block
		// ▀ = upper half, ▄ = lower half, ▌ = left half, ▐ = right half
		const boat = [
			"              ▓",
			"             ▓█▓",
			"    ▓       ▓███▓",
			"   ▓█▓     ▓█████▓",
			"  ▓███▓   ▓███│███▓",
			" ▓█████▓ ▓████│████▓",
			"▓███████▓█████│█████▓",
			"▓████████████ │ █████▓",
			" ▓███████████ │ ████▓",
			"  ▓█████████  │  ███▓",
			"   ▓███████   │   ██▓",
			"    ▓█████    │    █▓",
			"     ▀███▀▀▀▀▀│▀▀▀▀▀",
			"      ▀██████████████▀",
		];

		// Create 12 frames with boat moving right and waves animating
		const frames: string[] = [];
		const totalFrames = 12;
		const maxOffset = 15;

		for (let i = 0; i < totalFrames; i++) {
			// Smooth sailing motion
			const offset = Math.floor((i / totalFrames) * maxOffset);
			const wavePhase = i % 6;

			// Build each frame
			const frameLines: string[] = [];

			// Add boat lines with offset and slight vertical bobbing
			const bob = i % 4 < 2 ? 0 : 1;
			if (bob === 1) {
				frameLines.push(""); // Add extra line for bobbing effect
			}

			for (const line of boat) {
				frameLines.push(" ".repeat(offset) + line);
			}

			// Add animated wave lines using Unicode wave patterns
			const wave1 = this.createWaveLine(wavePhase, 0, 70);
			const wave2 = this.createWaveLine(wavePhase, 2, 68);
			const wave3 = this.createWaveLine(wavePhase, 4, 66);

			frameLines.push(wave1);
			frameLines.push(wave2);
			frameLines.push(wave3);

			frames.push(frameLines.join("\n"));
		}

		return frames;
	}

	/**
	 * Creates an animated wave line using Unicode block elements and shading.
	 */
	private createWaveLine(phase: number, offset: number, length: number): string {
		// Wave pattern using Unicode characters for depth and motion
		const wavePattern = ["≈", "~", "∼", "～", "≋", "∿"];
		const shadePattern = ["░", " ", "▒", " ", "░", " "];
		let wave = "";

		for (let i = 0; i < length; i++) {
			const patternIndex = (i + phase + offset) % wavePattern.length;
			const useShade = (i + phase) % 8 < 2;

			if (useShade) {
				wave += pc.cyan(shadePattern[patternIndex % shadePattern.length]);
			} else {
				wave += pc.cyan(wavePattern[patternIndex]);
			}
		}

		return wave;
	}

	/**
	 * Starts the sailing animation with optional custom message.
	 */
	public start(message?: string): void {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;
		this.frameIndex = 0;

		this.intervalId = setInterval(() => {
			const frame = this.frames[this.frameIndex];
			const display = message
				? `${frame}\n\n${pc.bold(message)}`
				: frame;

			logUpdate(display);

			this.frameIndex = (this.frameIndex + 1) % this.frames.length;
		}, 120); // ~8 fps for smooth sailing
	}

	/**
	 * Updates the message displayed below the animation.
	 */
	public updateMessage(message: string): void {
		if (!this.isRunning) {
			return;
		}

		const frame = this.frames[this.frameIndex];
		logUpdate(`${frame}\n\n${pc.bold(message)}`);
	}

	/**
	 * Stops the animation and clears the display.
	 */
	public stop(): void {
		if (!this.isRunning) {
			return;
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}

		this.isRunning = false;
		logUpdate.clear();
	}

	/**
	 * Stops the animation and persists the final frame.
	 */
	public done(finalMessage?: string): void {
		if (!this.isRunning) {
			return;
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}

		this.isRunning = false;

		if (finalMessage) {
			const frame = this.frames[this.frameIndex];
			logUpdate(`${frame}\n\n${pc.bold(pc.green(finalMessage))}`);
		}

		logUpdate.done();
	}

	/**
	 * Returns whether the animation is currently running.
	 */
	public get running(): boolean {
		return this.isRunning;
	}
}
