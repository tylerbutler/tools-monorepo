import type { Presence, StatesWorkspace } from "@fluidframework/presence/alpha";
import { StateFactory } from "@fluidframework/presence/alpha";
import { TinyliciousClient } from "@fluidframework/tinylicious-client";
import {
	type ContainerSchema,
	getPresence,
	type IFluidContainer,
	SharedTree,
} from "fluid-framework";

export interface MousePosition {
	x: number;
	y: number;
}

const containerSchema = {
	initialObjects: {
		tree: SharedTree,
	},
} satisfies ContainerSchema;

type AppSchema = typeof containerSchema;

export interface FluidConnection {
	container: IFluidContainer<AppSchema>;
	containerId: string;
	presence: Presence;
	statesWorkspace: StatesWorkspace<{
		mousePosition: ReturnType<typeof StateFactory.latest<MousePosition>>;
	}>;
}

/**
 * Connect to a Tinylicious Fluid container.
 *
 * If `existingContainerId` is provided, joins the existing container.
 * Otherwise, creates a new container and returns its ID.
 */
export async function connectToFluid(
	existingContainerId?: string,
): Promise<FluidConnection> {
	const client = new TinyliciousClient();

	let container: IFluidContainer<AppSchema>;
	let containerId: string;

	if (existingContainerId) {
		({ container } = await client.getContainer(
			existingContainerId,
			containerSchema,
			"2",
		));
		containerId = existingContainerId;
	} else {
		({ container } = await client.createContainer(containerSchema, "2"));
		containerId = await container.attach();
	}

	const presence = getPresence(container);

	const statesWorkspace = presence.states.getWorkspace("app:mouse-demo", {
		mousePosition: StateFactory.latest<MousePosition>({
			local: { x: 0, y: 0 },
		}),
	});

	return { container, containerId, presence, statesWorkspace };
}
