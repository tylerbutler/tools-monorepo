/**
 * Container runtime factory for the DiceRoller example.
 *
 * This module defines the container code that registers the DiceRoller
 * data object and provides entry points for the container.
 */

import { ContainerRuntimeFactoryWithDefaultDataStore } from "@fluidframework/aqueduct/legacy";
import type {
	IContainer,
	IFluidCodeDetails,
} from "@fluidframework/container-definitions/legacy";

import {
	DiceRollerFactory,
	DiceRollerName,
	type IDiceRoller,
} from "./diceRoller.js";

/**
 * The code details for the DiceRoller container.
 * Used when creating new containers or loading existing ones.
 */
export const DiceRollerContainerCodeDetails: IFluidCodeDetails = {
	package: "dice-roller-container",
	config: {},
};

/**
 * Factory for creating the DiceRoller container runtime.
 */
export const DiceRollerContainerFactory =
	new ContainerRuntimeFactoryWithDefaultDataStore({
		defaultFactory: DiceRollerFactory,
		registryEntries: [[DiceRollerName, Promise.resolve(DiceRollerFactory)]],
	});

/**
 * Gets the default DiceRoller data object from a container.
 */
export async function getDiceRollerFromContainer(
	container: IContainer,
): Promise<IDiceRoller> {
	const entryPoint = await container.getEntryPoint();
	return entryPoint as unknown as IDiceRoller;
}
