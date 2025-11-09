import { cliFunction } from "@cache-test/cli";
import { clientFunction } from "@cache-test/client";
import { serverFunction } from "@cache-test/server";

export function appDesktopFunction(): string {
	return `app-desktop-${cliFunction()}-${clientFunction()}-${serverFunction()}`;
}
