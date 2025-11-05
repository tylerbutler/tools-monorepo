import { typesFunction } from '@cache-test/types';
import { configFunction } from '@cache-test/config';

export function validationFunction(): string {
  return `validation-${typesFunction()}-${configFunction()}`;
}
