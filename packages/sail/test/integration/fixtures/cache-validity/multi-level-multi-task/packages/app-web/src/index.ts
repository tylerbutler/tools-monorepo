import { cliFunction } from '@cache-test/cli';
import { clientFunction } from '@cache-test/client';

export function appWebFunction(): string {
  return `app-web-${cliFunction()}-${clientFunction()}`;
}
