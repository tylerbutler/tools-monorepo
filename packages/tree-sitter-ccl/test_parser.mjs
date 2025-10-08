import Parser from "tree-sitter";
import CCL from "./bindings/node/index.js";

console.log("CCL type:", typeof CCL);
console.log("CCL constructor:", CCL.constructor.name);

const parser = new Parser();
console.log("Parser expects:", parser.setLanguage.toString());

// Try creating a language object differently
try {
	const binding = await import("./build/Release/tree_sitter_ccl_binding.node");
	console.log("Binding:", binding);
} catch (e) {
	console.log("Error importing binding:", e.message);
}
