import { SchemaFactory } from "fluid-framework";
import { createReactiveClass } from "./reactive-utils.js";

// Create a schema factory
const sf = new SchemaFactory("AppSchema");

// Define your schema
const schema = {
    name: sf.string,
    age: sf.number,
    isActive: sf.boolean
};

// Create a reactive class
const Person = createReactiveClass(sf, "Person", schema);

// Usage example
const person = new Person();
// Initialize reactive properties
person.initializeReactiveProperties();

// Set values - these are reactive and will update the Fluid Framework state
person.name = "John"; // TypeScript knows this is a string
person.age = 30; // TypeScript knows this is a number
person.isActive = true; // TypeScript knows this is a boolean

// Get values - these are reactive and will update when the Fluid Framework state changes
// biome-ignore lint/suspicious/noConsoleLog: Example code
console.log("Name:", person.name);
// biome-ignore lint/suspicious/noConsoleLog: Example code
console.log("Age:", person.age);
// biome-ignore lint/suspicious/noConsoleLog: Example code
console.log("Is Active:", person.isActive);

// The values are automatically synced with Fluid Framework
// When other clients update the values, the local reactive state will update automatically 