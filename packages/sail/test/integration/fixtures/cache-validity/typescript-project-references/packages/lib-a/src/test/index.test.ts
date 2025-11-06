import { Calculator, greet } from "../index";

// Simple test file that imports from main compilation
export function runTests() {
	const greeting = greet("World");
	console.log(greeting);

	const calc = new Calculator();
	console.log(`2 + 3 = ${calc.add(2, 3)}`);
	console.log(`4 * 5 = ${calc.multiply(4, 5)}`);
}
