/**
 * Minimal helpers to support DataObject creation for an otherwise empty container.
 */

import type {
	FluidObject,
	IFluidLoadable,
	IRequest,
	IResponse,
} from "@fluidframework/core-interfaces";
import type { IFluidHandleInternal } from "@fluidframework/core-interfaces/legacy";
import { assert } from "@fluidframework/core-utils/legacy";
import { FluidDataStoreRuntime } from "@fluidframework/datastore/legacy";
import type {
	IFluidDataStoreContext,
	IFluidDataStoreFactory,
} from "@fluidframework/runtime-definitions/legacy";
import { create404Response } from "@fluidframework/runtime-utils/legacy";

/**
 * BasicFluidDataStoreRuntime extends the FluidDataStoreRuntime to provide a
 * request method that routes requests to the entrypoint Fluid object that is
 * expected to be a LoadableFluidObject.
 */
class BasicFluidDataStoreRuntime extends FluidDataStoreRuntime {
	public override async request(request: IRequest): Promise<IResponse> {
		const response = await super.request(request);
		if (response.status !== 404) {
			return response;
		}

		// Return entrypoint object if someone requests it directly.
		if (
			request.url === "" ||
			request.url === "/" ||
			request.url.startsWith("/?")
		) {
			const dataObject = await this.entryPoint.get();
			assert(
				dataObject instanceof LoadableFluidObject,
				"Data store runtime entryPoint is not expected type",
			);
			return { mimeType: "fluid/object", status: 200, value: dataObject };
		}

		return create404Response(request);
	}
}

/**
 * BasicDataStoreFactory is the factory for creating a BasicFluidDataStoreRuntime.
 */
export class BasicDataStoreFactory<Type extends string>
	implements IFluidDataStoreFactory
{
	public get IFluidDataStoreFactory(): IFluidDataStoreFactory {
		return this;
	}

	public constructor(
		public readonly type: Type,
		private readonly instanceCtor: new (
			runtime: FluidDataStoreRuntime,
		) => LoadableFluidObject,
	) {}

	public async instantiateDataStore(
		context: IFluidDataStoreContext,
		existing: boolean,
	): Promise<FluidDataStoreRuntime> {
		// Create a new runtime for our data store.
		const runtime: FluidDataStoreRuntime = new BasicFluidDataStoreRuntime(
			context,
			/* ISharedObjectRegistry */ new Map(),
			existing,
			/* provideEntryPoint */ async () => {
				assert(instance !== undefined, "Intended entryPoint is undefined");
				return instance;
			},
		);

		const instance = new this.instanceCtor(runtime);

		return runtime;
	}
}

/**
 * LoadableFluidObject is helper to build a DataObject handling the FluidObject
 * and IFluidLoadable requirements.
 */
export abstract class LoadableFluidObject
	implements FluidObject, IFluidLoadable
{
	public constructor(protected readonly runtime: FluidDataStoreRuntime) {}

	public get IFluidLoadable(): this {
		return this;
	}

	/**
	 * Handle to the this Fluid object.
	 */
	public get handle(): IFluidHandleInternal<FluidObject> {
		assert(this.runtime.entryPoint !== undefined, "EntryPoint was undefined");
		return this.runtime.entryPoint;
	}
}
