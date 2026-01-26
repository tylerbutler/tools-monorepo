/**
 * DiceRoller DataObject and React view.
 *
 * This module implements a collaborative dice roller using Fluid Framework's
 * DataObject pattern. Multiple users can see the same dice value and roll
 * together in real-time.
 */

import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct/legacy";
import type React from "react";
import { useEffect, useState } from "react";

/**
 * Interface for the DiceRoller data object.
 */
export interface IDiceRoller {
	/** The current dice value (1-6) */
	readonly value: number;
	/** Rolls the dice to a new random value */
	roll(): void;
	/** Registers a listener for dice value changes */
	on(event: "diceRolled", listener: () => void): this;
	/** Removes a listener for dice value changes */
	off(event: "diceRolled", listener: () => void): this;
}

const diceValueKey = "diceValue";

/**
 * DiceRoller DataObject implementation.
 *
 * Uses a SharedDirectory (this.root) to store the dice value,
 * which is automatically synchronized across all connected clients.
 */
export class DiceRoller extends DataObject implements IDiceRoller {
	/**
	 * Gets the current dice value.
	 */
	public get value(): number {
		const value = this.root.get<number>(diceValueKey);
		return value ?? 1;
	}

	/**
	 * Rolls the dice to a new random value between 1 and 6.
	 */
	public roll(): void {
		const newValue = Math.floor(Math.random() * 6) + 1;
		this.root.set(diceValueKey, newValue);
	}

	/**
	 * Called when the DataObject is first created.
	 * Initializes the dice value to 1.
	 */
	protected override async initializingFirstTime(): Promise<void> {
		this.root.set(diceValueKey, 1);
	}

	/**
	 * Called when the DataObject has finished loading.
	 * Sets up event listeners for value changes.
	 */
	protected override async hasInitialized(): Promise<void> {
		this.root.on("valueChanged", () => {
			this.emit("diceRolled");
		});
	}
}

/**
 * The type name for the DiceRoller DataObject.
 */
export const DiceRollerName = "dice-roller";

/**
 * Factory for creating DiceRoller instances.
 */
export const DiceRollerFactory = new DataObjectFactory<DiceRoller>(
	DiceRollerName,
	DiceRoller,
	[],
	{},
);

// ============================================================
// React Components
// ============================================================

/**
 * Props for the DiceRollerView component.
 */
interface DiceRollerViewProps {
	diceRoller: IDiceRoller;
}

/**
 * Unicode dice face characters for values 1-6.
 */
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/**
 * React component that displays the dice and roll button.
 */
export function DiceRollerView({
	diceRoller,
}: DiceRollerViewProps): React.ReactElement {
	const [value, setValue] = useState(diceRoller.value);

	useEffect(() => {
		const handleRoll = (): void => {
			setValue(diceRoller.value);
		};

		diceRoller.on("diceRolled", handleRoll);
		return () => {
			diceRoller.off("diceRolled", handleRoll);
		};
	}, [diceRoller]);

	const handleClick = (): void => {
		diceRoller.roll();
	};

	const diceChar = diceFaces[value - 1] ?? "?";

	return (
		<div style={styles.container}>
			<h1 style={styles.title}>Levee DiceRoller</h1>
			<div style={styles.diceContainer}>
				<span style={styles.dice}>{diceChar}</span>
				<span style={styles.value}>Value: {value}</span>
			</div>
			<button type="button" onClick={handleClick} style={styles.button}>
				Roll
			</button>
			<p style={styles.hint}>
				Open this page in another tab to see real-time sync!
			</p>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "20px",
		backgroundColor: "white",
		borderRadius: "12px",
		boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
	},
	title: {
		margin: "0 0 20px 0",
		color: "#333",
		fontSize: "24px",
	},
	diceContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		marginBottom: "20px",
	},
	dice: {
		fontSize: "120px",
		lineHeight: "1",
		color: "#333",
	},
	value: {
		fontSize: "18px",
		color: "#666",
		marginTop: "10px",
	},
	button: {
		padding: "12px 48px",
		fontSize: "18px",
		fontWeight: "bold",
		color: "white",
		backgroundColor: "#4CAF50",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		transition: "background-color 0.2s",
	},
	hint: {
		marginTop: "20px",
		fontSize: "14px",
		color: "#888",
		textAlign: "center",
	},
};
