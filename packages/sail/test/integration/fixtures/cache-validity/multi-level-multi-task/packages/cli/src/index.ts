import { coreFunction } from '@cache-test/core';
import { validationFunction } from '@cache-test/validation';
import { parserFunction } from '@cache-test/parser';

export function cliFunction(): string {
  return `cli-${coreFunction()}-${validationFunction()}-${parserFunction()}`;
}
