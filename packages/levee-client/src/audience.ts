import { assert } from "@fluidframework/core-utils/internal";
import type { IClient } from "@fluidframework/driver-definitions";

import type { LeveeMember, LeveeUser } from "./interfaces.js";

/**
 * Creates a {@link LeveeMember} for the provided client.
 *
 * @remarks
 * Assumes that the provided client's {@link @fluidframework/protocol-definitions#IClient.user} is of type {@link LeveeUser}.
 * This function will fail if that is not the case.
 */
export function createLeveeAudienceMember(
	audienceMember: IClient,
): LeveeMember {
	const leveeUser = audienceMember.user as Partial<LeveeUser>;
	assert(
		leveeUser !== undefined &&
			typeof leveeUser.id === "string" &&
			typeof leveeUser.name === "string",
		'Specified user was not of type "LeveeUser".',
	);

	return {
		id: leveeUser.id,
		name: leveeUser.name,
		connections: [],
	};
}
