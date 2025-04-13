import { SchemaFactory, Tree } from "fluid-framework";
import { Reactive, ReactiveSharedTree } from "./decorators.svelte.js";

export const sf = new SchemaFactory("AppSchema");

/**
 * This class represents a Sudoku Cell's shared, persisted data, which is stored in a Fluid SharedTree.
 */
export class CellPersistedData extends sf.object("CellPersistedData", {
	/**
	 * The value stored in the cell. This should be a value between 0 and 9 inclusive. 0 represents an empty cell.
	 */
	_value: sf.number,

	/**
	 * The correct value of the cell.
	 */
	_correctValue: sf.number,

	/**
	 * True if the cell's value is provided as part of the starting clues for the puzzle; false otherwise.
	 */
	_startingClue: sf.boolean,

	/**
	 * The coordinate of the cell in the Sudoku grid, stored as a 2-item array. The first number is row in which the cell
	 * is positioned, while the second is the column. The coordinate system is 0-based starting at the upper left; that
	 * is, `[0,0]` represents the upper-leftmost cell, `[0,1]` is to its immediate right, etc.
	 */
	_coordinate: sf.array(sf.number),
}) {
	/**
	 * True if the value in the cell is correct; false otherwise.
	 */
	public get isCorrect() {
		return !this._startingClue && this._value === this._correctValue;
	}

	public get coordinate(): CellCoordinate {
		return [this._coordinate[0], this._coordinate[1]] as CellCoordinate;
	}

	public get coordinateString(): CoordinateString {
		return Coordinate.asString(this._coordinate[0], this._coordinate[1]);
	}
}

const CellStatus = {
	empty: "empty",
	startingClue: "startingClue",
	wrong: "wrong",
	correct: "correct",
} as const;

type CellStatus = (typeof CellStatus)[keyof typeof CellStatus];

/**
 * Utility type that excludes keys whose name begins with an underscore.
 */
type ExcludeUnderscoreProperties<T> = {
	[K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

/**
 * Represents the SudokuCellData that is reactive and safe to use in templates (views).
 *
 * All properties are reactive.
 */
export type SudokuCellViewData =
	ExcludeUnderscoreProperties<SudokuCellDataInternal>;

/**
 * Encapsulates all Cell-related data, including persisted data stored in a SharedTree, ephemeral session-related data
 * that typically comes from presence, and instance-local data. The data is accessed exclusively through properties.
 *
 * By convention, properties that are part of a SharedTree begin with an underscore and should not be accessed directly,
 * despite being public. Instead, the properties of the SudokuCellViewData interface should be used. These properties
 * are all reactive, meaning they can be used directly in component views and will be reactive to both local changes and
 * remote changes.
 */
export class SudokuCellDataInternal
	extends CellPersistedData
	implements SudokuCellViewData
{
	/**
	 * This property exists solely to wire up the tree to the reactive properties of
	 * the class when it is instantiated.
	 */
	#wireReactiveProperties = (() => {
		Tree.on(this, "nodeChanged", () => {
			this.refreshReactiveProperties();
		});
	})();

	#value: SudokuNumber = $state(this._value as SudokuNumber);
	public set value(v) {
		// set the persisted data, which will trigger an event that will update the local data.
		this._value = v;
	}
	public get value() {
		return this.#value;
	}

	#correctValue: SudokuNumber = $state(this._correctValue as SudokuNumber);
	public get correctValue() {
		return this.#correctValue;
	}
	public set correctValue(v) {
		// set the persisted data in the shared tree, which will trigger an event that will update the local data.
		this._correctValue = v;
	}

	#startingClue: boolean = $state(this._startingClue);
	public get startingClue() {
		return this.#startingClue;
	}
	public set startingClue(clue) {
		this._startingClue = clue;
	}

	public displayString = $derived.by(() => {
		if (this.startingClue || this.value !== 0) {
			return this.value.toString();
		}
		return "";
	});

	/**
	 * Returns the appropriate CellStatus for the cell. This status can be used to render the cell differently.
	 */
	public status = $derived.by(() => {
		if (this.value === 0) {
			return CellStatus.empty;
		}

		if (this.startingClue) {
			return CellStatus.startingClue;
		}

		if (this.isCorrect && !this.startingClue) {
			return CellStatus.correct;
		}

		return CellStatus.wrong;
	});

	private refreshReactiveProperties(): void {
		if (!isSudokuNumber(this._value) || !isSudokuNumber(this._correctValue)) {
			throw new Error(
				`Value is not a valid sudoku number: ${this._value} or ${this._correctValue}`,
			);
		}
		// console.log(`Refreshing reactive properties for cell: ${this.coordinate}`);

		this.#startingClue = this._startingClue;
		this.#correctValue = this._correctValue as SudokuNumber;
		this.#value = this._value as SudokuNumber;
	}
}

@ReactiveSharedTree
export class ReactiveClass extends sf.object("ReactiveClass", {
	/**
	 * The value stored in the cell. This should be a value between 0 and 9 inclusive. 0 represents an empty cell.
	 */
  @Reactive
	value: sf.number,

  @Reactive
	correctValue: sf.number,

  @Reactive
	startingClue: sf.boolean,

  @Reactive
	coordinate: sf.array(sf.number),
}
)
{
}
