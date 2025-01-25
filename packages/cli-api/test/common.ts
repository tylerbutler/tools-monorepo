import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const testDataPath = path.join(__dirname, "data");

export interface TestConfigSchema {
	stringProperty: string;
}
