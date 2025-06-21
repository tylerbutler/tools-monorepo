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
	FluidObject,
	ITelemetryBaseLogger,
} from "@fluidframework/core-interfaces";
import { assert } from "@fluidframework/core-utils/internal";
import type { IClient } from "@fluidframework/driver-definitions";
import type {
	IDocumentServiceFactory,
	IUrlResolver,
} from "@fluidframework/driver-definitions/internal";
import type {
	CompatibilityMode,
	ContainerSchema,
	IFluidContainer,
} from "@fluidframework/fluid-static";
import {
	createDOProviderContainerRuntimeFactory,
	createFluidContainer,
	createServiceAudience,
	type IRootDataObject,
} from "@fluidframework/fluid-static/internal";
import { RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver/internal";
import { wrapConfigProviderWithDefaults } from "@fluidframework/telemetry-utils/internal";
import {
	createTinyliciousCreateNewRequest,
	InsecureTinyliciousUrlResolver,
} from "@fluidframework/tinylicious-driver/internal";

import { createLeveeAudienceMember } from "./audience.js";
import type { LeveeClientProps, LeveeContainerServices } from "./interfaces.js";

/**
 * @public
 */
export class LeveeClient {
	private readonly documentServiceFactory: IDocumentServiceFactory;
	private readonly urlResolver: IUrlResolver;
	private readonly logger: ITelemetryBaseLogger | undefined;

	/**
	 * Creates a new client instance using configuration parameters.
	 * @param properties - Optional. Properties for initializing a new LeveeClient instance
	 */
	public constructor(properties: LeveeClientProps) {
		this.logger = properties?.logger;
		this.urlResolver = new InsecureTinyliciousUrlResolver(
			properties.connection.port,
			properties.connection.domain,
		);
		this.documentServiceFactory = new RouterliciousDocumentServiceFactory(
			properties.connection.tokenProvider,
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

		const rootDataObject = await this.getContainerEntryPoint(container);

		/**
		 * See {@link FluidContainer.attach}
		 */
		const attach = async (): Promise<string> => {
			if (container.attachState !== AttachState.Detached) {
				throw new Error(
					"Cannot attach container. Container is not in detached state.",
				);
			}
			const request = createTinyliciousCreateNewRequest();
			await container.attach(request);
			if (container.resolvedUrl === undefined) {
				throw new Error("Resolved Url not available on attached container");
			}
			return container.resolvedUrl.id;
		};

		const fluidContainer = createFluidContainer<TContainerSchema>({
			container,
			rootDataObject,
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
		const rootDataObject = await this.getContainerEntryPoint(container);
		const fluidContainer = createFluidContainer<TContainerSchema>({
			container,
			rootDataObject,
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
		// biome-ignore lint/suspicious/useAwait: <explanation>
		const load = async (): Promise<IFluidModuleWithDetails> => {
			return {
				module: { fluidExport: containerRuntimeFactory },
				details: { package: "no-dynamic-package", config: {} },
			};
		};

		const codeLoader = { load };
		const client: IClient = {
			details: {
				capabilities: { interactive: true },
			},
			permission: [],
			scopes: [],
			user: { id: "" },
			mode: "write",
		};

		const featureGates: Record<string, ConfigTypes> = {
			// T9s client requires a write connection by default
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

	private async getContainerEntryPoint(
		container: IContainer,
	): Promise<IRootDataObject> {
		const rootDataObject: FluidObject<IRootDataObject> =
			await container.getEntryPoint();
		assert(
			rootDataObject.IRootDataObject !== undefined,
			0x875 /* entryPoint must be of type IRootDataObject */,
		);
		return rootDataObject.IRootDataObject;
	}
	// #endregion
}
