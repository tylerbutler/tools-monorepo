import type { ImplicitFieldSchema } from "fluid-framework";
import { SchemaFactory, Tree } from "fluid-framework";

// export const sf = new SchemaFactory("AppSchema");

// export function reactiveObjectFactory<T extends { readonly [x: string]: ImplicitFieldSchema; }>(
// 	sf: SchemaFactory,
// 	schemaKey: string,
// 	schema: T,
// ) {
// 	class SharedTreeData extends sf.object(schemaKey, schema) {}
// }

export function reactiveObjectFactory<T extends Record<string, ImplicitFieldSchema>>(
	sf: SchemaFactory,
	schemaName: string,
	schema: T,
) {

	const prefixedSchema = Object.fromEntries(
		Object.entries(schema).map(([k, v]) => [`__${k}`, v]),
	) as Record<string, ImplicitFieldSchema>;

	class ReactiveCellClass extends sf.object(schemaName, prefixedSchema) {
		static {
			// Initialize reactive properties based on schema
			for (const [privateKey] of Object.entries(prefixedSchema)) {
				const publicKey = privateKey.replace(/^__/, '');
				
				// Create reactive property
				Object.defineProperty(ReactiveCellClass.prototype, publicKey, {
					get: function() {
						return this[privateKey];
					},
					set: function(newValue) {
						this[privateKey] = newValue;
					},
					enumerable: true,
					configurable: true
				});
			}
		}
	}

	return ReactiveCellClass;
}

const ReactiveKeysSymbol = Symbol("reactive:keys");

/**
 * Decorator to mark properties as reactive.
 *
 * @param target
 * @param key
 */

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function Reactive1(target: any, context: ClassFieldDecoratorContext) {
	if (!target[ReactiveKeysSymbol]) {
		target[ReactiveKeysSymbol] = [];
	}
	target[ReactiveKeysSymbol].push(context.name);
}

export function Reactive(target: any, propertyKey: string): void {
	const privateKey = `__${propertyKey}`;

	Object.defineProperty(target, propertyKey, {
		get() {
			return this[privateKey];
		},
		set(value) {
			this[privateKey] = value;
			// Trigger reactivity logic here, e.g., notify observers or update bindings
			if (this.onReactivePropertyChange) {
				this.onReactivePropertyChange(propertyKey, value);
			}
		},
		enumerable: true,
		configurable: true,
	});
}

/**
 * A class decorator that creates a class with reactive properties.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for mixin classes.
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export function ReactiveSharedTree<T extends { new (...args: any[]): {} }>(
	ctor: T,
) {
	return class extends ctor {
		// biome-ignore lint/suspicious/noExplicitAny: Required for mixin classes.
		constructor(...args: any[]) {
			super(...args);
			// biome-ignore lint/suspicious/noExplicitAny:
			const keys: string[] = (ctor.prototype as any)[ReactiveKeysSymbol] || [];

			for (const key of keys) {
				const computedKey = `computed_${key}`;
				Object.defineProperty(this, computedKey, {
					get: () => `Computed: ${(this as Record<string, any>)[key]}`,
					enumerable: true,
					configurable: true,
				});
			}
		}
	};
}

@ReactiveSharedTree
export class Cell {
	@Reactive
	name: string;

	@Reactive
	role: string;

	constructor(name: string, role: string) {
		this.name = name;
		this.role = role;
	}

	// Optional: declare them for TypeScript support
	computed_name!: string;
	computed_role!: string;
}

// const user = new Cell("Alice", "Admin");

// console.log(user.name);           // "Alice"
// console.log(user.computed_name);  // "Computed: Alice"
// console.log(user.computed_role);  // "Computed: Admin"
