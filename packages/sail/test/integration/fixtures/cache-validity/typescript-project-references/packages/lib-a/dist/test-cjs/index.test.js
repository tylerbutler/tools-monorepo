"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const index_1 = require("../index");
// Simple test file that imports from main compilation
function runTests() {
    const greeting = (0, index_1.greet)('World');
    console.log(greeting);
    const calc = new index_1.Calculator();
    console.log(`2 + 3 = ${calc.add(2, 3)}`);
    console.log(`4 * 5 = ${calc.multiply(4, 5)}`);
}
