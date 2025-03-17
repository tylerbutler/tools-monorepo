import {
	DataObject,
	DataObjectFactory,
	type IDataObjectProps,
	createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import type { SharedObjectKind } from "@fluidframework/shared-object-base";

/**
 * Mock {@link @fluidframework/aqueduct#DataObject} for use in tests.
 */
class TestDataObjectClass extends DataObject {
	public static readonly Name = "@fluid-example/test-data-object";

	public static readonly factory = new DataObjectFactory(
		TestDataObjectClass.Name,
		TestDataObjectClass,
		[],
		{},
	);

	public constructor(props: IDataObjectProps) {
		super(props);
	}
}

/**
 * {@inheritDoc TestDataObjectClass}
 */
export const TestDataObject: typeof TestDataObjectClass &
	SharedObjectKind<TestDataObjectClass> =
	createDataObjectKind(TestDataObjectClass);

/**
 * {@inheritDoc TestDataObjectClass}
 */
export type TestDataObject = TestDataObjectClass;
