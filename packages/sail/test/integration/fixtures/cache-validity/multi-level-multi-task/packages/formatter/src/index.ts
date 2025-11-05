import { utilsFunction } from '@cache-test/utils';
import { configFunction } from '@cache-test/config';

export function formatterFunction(): string {
  return `formatter-${utilsFunction()}-${configFunction()}`;
}
