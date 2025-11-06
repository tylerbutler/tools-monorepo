"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calculator = void 0;
exports.greet = greet;
function greet(name) {
    return `Hello, ${name}!`;
}
class Calculator {
    add(a, b) {
        return a + b;
    }
    multiply(a, b) {
        return a * b;
    }
}
exports.Calculator = Calculator;
