import type { ITelemetryBaseLogger } from "@fluidframework/core-interfaces";
import type { IUser } from "@fluidframework/driver-definitions";
import type { IMember, IServiceAudience } from "@fluidframework/fluid-static";
import type { ITokenProvider } from "@fluidframework/routerlicious-driver";

/**
 * Properties for initializing a {@link LeveeClient}.
 * @sealed
 * @public
 */
export interface LeveeClientProps {
	/**
	 * Optional. Configuration for establishing a connection with the Levee.
	 * If not specified, will use {@link LeveeConnectionConfig}'s default values.
	 */
	readonly connection: LeveeConnectionConfig;

	/**
	 * Optional. A logger instance to receive diagnostic messages.
	 */
	readonly logger?: ITelemetryBaseLogger;
}

export interface LeveeConnectionConfig {
	readonly port?: number;
	readonly domain?: string;
	readonly tokenProvider: ITokenProvider;
}

/**
 * Holds the functionality specifically tied to the Levee service, and how the data stored in
 * the {@link @fluidframework/fluid-static#IFluidContainer} is persisted in the backend and consumed by users.
 *
 * @remarks
 * Any functionality regarding how the data is handled within the FluidContainer itself (e.g., which data objects or
 * DDSes to use) will not be included here but rather on the FluidContainer class itself.
 *
 * Returned by {@link LeveeClient.createContainer} and {@link LeveeClient.getContainer} alongside the FluidContainer.
 *
 * @sealed
 * @public
 */
export interface LeveeContainerServices {
	/**
	 * Provides an object that can be used to get the users that are present in this Fluid session and
	 * listeners for when the roster has any changes from users joining/leaving the session.
	 */
	readonly audience: ILeveeAudience;
}

/**
 * Levee {@link @fluidframework/fluid-static#IUser}.
 * @sealed
 * @public
 */
export interface LeveeUser extends IUser {
	/**
	 * The user's name
	 */
	readonly name: string;
}

/**
 * Levee {@link @fluidframework/fluid-static#IMember}.
 * @sealed
 * @public
 */
export interface LeveeMember extends IMember {
	/**
	 * {@inheritDoc LeveeUser.name}
	 */
	readonly name: string;
}

/**
 * Levee {@link @fluidframework/fluid-static#IServiceAudience}.
 * @sealed
 * @public
 */
export type ILeveeAudience = IServiceAudience<LeveeMember>;
