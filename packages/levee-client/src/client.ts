import { AttachState } from "@fluidframework/container-definitions";
import type {
	IContainer,
	IFluidModuleWithDetails,
} from "@fluidframework/container-definitions/internal";
import {
	createDetachedContainer,
	type ILoaderProps,
	loadExistingContainer,
} from "@fluidframework/container-loader/internal";
import type {
	ConfigTypes,
	ITelemetryBaseLogger,
} from "@fluidframework/core-interfaces";
import type { IClient, IUser } from "@fluidframework/driver-definitions";
import type { IDocumentServiceFactory } from "@fluidframework/driver-definitions/internal";
import type {
	CompatibilityMode,
	ContainerSchema,
	IFluidContainer,
} from "@fluidframework/fluid-static";
import {
	createDOProviderContainerRuntimeFactory,
	createFluidContainer,
	createServiceAudience,
} from "@fluidframework/fluid-static/internal";
import { wrapConfigProviderWithDefaults } from "@fluidframework/telemetry-utils/internal";
import {
	InsecureLeveeTokenProvider,
	LeveeDocumentServiceFactory,
	LeveeUrlResolver,
	type LeveeUser,
} from "@tylerbu/levee-driver";

import { createLeveeAudienceMember } from "./audience.js";
import type { LeveeClientProps, LeveeContainerServices } from "./interfaces.js";

/**
 * Client for interacting with Levee service to create and manage Fluid containers.
 *
 * @remarks
 * The LeveeClient provides a simplified interface for creating and accessing Fluid containers
 * through the Levee service. It handles container lifecycle, authentication, and service configuration.
 *
 * @example
 * ```typescript
 * const client = new LeveeClient({
 *   connection: {
 *     httpUrl: "http://localhost:4000",
 *     socketUrl: "ws://localhost:4000/socket",
 *     tenantKey: "dev-secret",
 *     user: { id: "user-123", name: "Test User" },
 *   }
 * });
 *
 * const { container, services } = await client.createContainer(schema, "2");
 * ```
 *
 * @public
 */
export class LeveeClient {
	private readonly documentServiceFactory: IDocumentServiceFactory;
	private readonly urlResolver: LeveeUrlResolver;
	private readonly logger: ITelemetryBaseLogger | undefined;
	private readonly user: LeveeUser;

	/**
	 * Creates a new client instance using configuration parameters.
	 * @param properties - Optional. Properties for initializing a new LeveeClient instance
	 */
	public constructor(properties: LeveeClientProps) {
		const { connection } = properties;
		this.logger = properties?.logger;
		this.user = connection.user;

		// Create URL resolver with the configured URLs
		this.urlResolver = new LeveeUrlResolver(
			connection.socketUrl,
			connection.httpUrl,
			connection.tenantId,
		);

		// Use provided token provider or create an InsecureLeveeTokenProvider
		const tokenProvider =
			connection.tokenProvider ??
			new InsecureLeveeTokenProvider(
				connection.tenantKey ?? "",
				connection.user,
				connection.tenantId,
			);

		this.documentServiceFactory = new LeveeDocumentServiceFactory(
			tokenProvider,
		);
	}

	/**
	 * Creates a new detached container instance in Levee server.
	 * @param containerSchema - Container schema for the new container.
	 * @param compatibilityMode - Compatibility mode the container should run in.
	 * @returns New detached container instance along with associated services.
	 */
	public async createContainer<TContainerSchema extends ContainerSchema>(
		containerSchema: TContainerSchema,
		compatibilityMode: CompatibilityMode,
	): Promise<{
		container: IFluidContainer<TContainerSchema>;
		services: LeveeContainerServices;
	}> {
		const loaderProps = this.getLoaderProps(containerSchema, compatibilityMode);

		// We're not actually using the code proposal (our code loader always loads the same module
		// regardless of the proposal), but the Container will only give us a NullRuntime if there's
		// no proposal.  So we'll use a fake proposal.
		const container = await createDetachedContainer({
			...loaderProps,
			codeDetails: {
				package: "no-dynamic-package",
				config: {},
			},
		});

		/**
		 * See {@link FluidContainer.attach}
		 */
		const attach = async (): Promise<string> => {
			if (container.attachState !== AttachState.Detached) {
				throw new Error(
					"Cannot attach container. Container is not in detached state.",
				);
			}
			const request = this.urlResolver.createCreateNewRequest();
			await container.attach(request);
			if (container.resolvedUrl === undefined) {
				throw new Error("Resolved Url not available on attached container");
			}
			return container.resolvedUrl.id;
		};

		const fluidContainer = await createFluidContainer<TContainerSchema>({
			container,
		});
		fluidContainer.attach = attach;

		const services = this.getContainerServices(container);
		return { container: fluidContainer, services };
	}

	/**
	 * Accesses the existing container given its unique ID in the Levee server.
	 * @param id - Unique ID of the container.
	 * @param containerSchema - Container schema used to access data objects in the container.
	 * @param compatibilityMode - Compatibility mode the container should run in.
	 * @returns Existing container instance along with associated services.
	 */
	public async getContainer<TContainerSchema extends ContainerSchema>(
		id: string,
		containerSchema: TContainerSchema,
		compatibilityMode: CompatibilityMode,
	): Promise<{
		container: IFluidContainer<TContainerSchema>;
		services: LeveeContainerServices;
	}> {
		const loaderProps = this.getLoaderProps(containerSchema, compatibilityMode);
		const container = await loadExistingContainer({
			...loaderProps,
			request: { url: id },
		});
		const fluidContainer = await createFluidContainer<TContainerSchema>({
			container,
		});
		const services = this.getContainerServices(container);
		return { container: fluidContainer, services };
	}

	// #region private
	private getContainerServices(container: IContainer): LeveeContainerServices {
		return {
			audience: createServiceAudience({
				container,
				createServiceMember: createLeveeAudienceMember,
			}),
		};
	}

	private getLoaderProps(
		schema: ContainerSchema,
		compatibilityMode: CompatibilityMode,
	): ILoaderProps {
		const containerRuntimeFactory = createDOProviderContainerRuntimeFactory({
			schema,
			compatibilityMode,
		});
		const load = async (): Promise<IFluidModuleWithDetails> => {
			return {
				module: { fluidExport: containerRuntimeFactory },
				details: { package: "no-dynamic-package", config: {} },
			};
		};

		const codeLoader = { load };
		// Cast user to IUser since Fluid Framework passes through additional properties to audience
		const user = { id: this.user.id, name: this.user.name ?? "" } as IUser;
		const client: IClient = {
			details: {
				capabilities: { interactive: true },
			},
			permission: [],
			scopes: [],
			user,
			mode: "write",
		};

		const featureGates: Record<string, ConfigTypes> = {
			// Levee requires a write connection by default
			"Fluid.Container.ForceWriteConnection": true,
		};
		const loaderProps = {
			urlResolver: this.urlResolver,
			documentServiceFactory: this.documentServiceFactory,
			codeLoader,
			logger: this.logger,
			options: { client },
			configProvider: wrapConfigProviderWithDefaults(
				/* original */ undefined,
				featureGates,
			),
		};

		return loaderProps;
	}

	// #endregion
}
