import { parserFunction } from '@cache-test/parser';
import { formatterFunction } from '@cache-test/formatter';

export function clientFunction(): string {
  return `client-${parserFunction()}-${formatterFunction()}`;
}
