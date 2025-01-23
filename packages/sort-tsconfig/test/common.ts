import { fileURLToPath } from "node:url";
import { dirname, join } from "pathe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const testDataPath = join(__dirname, "data");
