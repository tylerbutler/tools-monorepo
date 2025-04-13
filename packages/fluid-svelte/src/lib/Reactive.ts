import { Tree } from "fluid-framework";

type PropertyDecorator = (target: object, propertyKey: string | symbol) => void;

export const Reactive: PropertyDecorator = (
	target: object,
	propertyKey: string | symbol,
) => {
	// Create a private field to store the reactive state
	const privateKey = `#${String(propertyKey)}`;
	const fluidKey = `__${String(propertyKey)}`;

	// Define the getter and setter
	Object.defineProperty(target, propertyKey, {
		get() {
			if (!this[privateKey]) {
				this[privateKey] = $state(this[fluidKey]);

				Tree.on(this, "nodeChanged", () => {
					this[privateKey] = this[fluidKey];
				});
			}
			return this[privateKey];
		},
		set(value: unknown) {
			this[fluidKey] = value;
		},
	});
};

function ReactiveClass(
	target: new (...args: any[]) => any,
	context: ClassDecoratorContext,
) {
	// target is the class constructor
	// context contains metadata about the class
	context.addInitializer(() => {
		target.name;
	});
	return target;
}
