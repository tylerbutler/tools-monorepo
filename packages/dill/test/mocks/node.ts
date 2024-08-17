import { setupServer } from "msw/node";
import { testHttpHandlers } from "./handlers.js";

export const server = setupServer(...testHttpHandlers);
