import { setupServer } from "msw/node";
import { testHttpHandlers } from "./handlers.ts";

export const mockServer = setupServer(...testHttpHandlers);
