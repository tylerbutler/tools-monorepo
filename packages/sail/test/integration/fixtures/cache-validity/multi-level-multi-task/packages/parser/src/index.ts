import { utilsFunction } from '@cache-test/utils';
import { typesFunction } from '@cache-test/types';

export function parserFunction(): string {
  return `parser-${utilsFunction()}-${typesFunction()}`;
}
