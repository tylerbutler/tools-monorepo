import { SchemaFactory, Tree } from "fluid-framework";
import type { ImplicitFieldSchema, TreeNode } from "fluid-framework";

/**
 * A symbol to store reactive property metadata
 */
const REACTIVE_PROPERTIES = Symbol("reactive:properties");

interface ReactiveMetadata {
    [REACTIVE_PROPERTIES]?: Set<string>;
}

type SchemaType<T> = {
    [K in keyof T]: T[K] extends ImplicitFieldSchema ? T[K] : never;
};

/**
 * Utility type to get the value type from a Fluid Framework schema
 */
type SchemaValueType<T> = T extends ImplicitFieldSchema ? ReturnType<T["create"]> : never;

/**
 * Utility type to create a record of property names to their value types
 */
type SchemaToValueTypes<T extends Record<string, ImplicitFieldSchema>> = {
    -readonly [K in keyof T]: SchemaValueType<T[K]>;
};

/**
 * Utility type to create a record of property names to their Fluid Framework node names
 */
type SchemaToNodeNames<T extends Record<string, ImplicitFieldSchema>> = {
    [K in keyof T as `${K & string}TNode`]: T[K];
};

/**
 * Utility type to create a record of property names to their private state names
 */
type SchemaToPrivateNames<T extends Record<string, ImplicitFieldSchema>> = {
    [K in keyof T as `_${K & string}`]: SchemaValueType<T[K]>;
};

/**
 * Combined type for a reactive class instance
 */
type ReactiveInstance<T extends Record<string, ImplicitFieldSchema>> = TreeNode & 
    SchemaToValueTypes<T> & 
    SchemaToNodeNames<T> & 
    SchemaToPrivateNames<T> & {
        initializeReactiveProperties(): void;
    };

/**
 * Decorator to mark a property as reactive
 */
export function Reactive<T extends ReactiveMetadata>(target: T, propertyKey: string) {
    const privateKey = `_${propertyKey}`;
    
    // Store the property in metadata
    if (!target[REACTIVE_PROPERTIES]) {
        target[REACTIVE_PROPERTIES] = new Set<string>();
    }
    target[REACTIVE_PROPERTIES].add(propertyKey);

    // Define the reactive property
    Object.defineProperty(target, propertyKey, {
        get() {
            return this[privateKey];
        },
        set(value) {
            this[privateKey] = value;
            // Update the Fluid Framework property
            this[`${propertyKey}Val`] = value;
        },
        enumerable: true,
        configurable: true
    });
}

/**
 * Helper function to create a reactive Fluid Framework class
 */
export function createReactiveClass<T extends Record<string, ImplicitFieldSchema>>(
    sf: SchemaFactory,
    schemaName: string,
    schema: T
) {
    // Create the Fluid Framework schema with TNode suffix for properties
    const fluidSchema = Object.fromEntries(
        Object.entries(schema).map(([key, value]) => [`${key}TNode`, value])
    ) as SchemaToNodeNames<T>;

    class ReactiveClass extends sf.object(schemaName, fluidSchema) {
        #initialized = false;

        // Initialize reactive properties after construction
        initializeReactiveProperties() {
            if (this.#initialized) return;
            this.#initialized = true;

            // Initialize reactive state for each property
            for (const [key] of Object.entries(schema)) {
                const privateKey = `_${key}` as const;
                const fluidKey = `${key}TNode` as const;
                
                // Initialize the reactive state
                (this as any)[privateKey] = $state((this as any)[fluidKey]);

                // Define the reactive property
                Object.defineProperty(this, key, {
                    get() {
                        return (this as any)[privateKey];
                    },
                    set(value) {
                        (this as any)[privateKey] = value;
                        (this as any)[fluidKey] = value;
                    },
                    enumerable: true,
                    configurable: true
                });
            }

            // Wire up the tree change listener
            Tree.on(this, "nodeChanged", () => {
                this.refreshReactiveProperties();
            });
        }

        private refreshReactiveProperties(): void {
            for (const [key] of Object.entries(schema)) {
                const privateKey = `_${key}` as const;
                const fluidKey = `${key}TNode` as const;
                (this as any)[privateKey] = (this as any)[fluidKey];
            }
        }
    }

    return ReactiveClass as unknown as new () => ReactiveInstance<T>;
} 