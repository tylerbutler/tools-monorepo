import { utilsFunction } from '@cache-test/utils';
import { typesFunction } from '@cache-test/types';

export function coreFunction(): string {
  return `core-${utilsFunction()}-${typesFunction()}`;
}
