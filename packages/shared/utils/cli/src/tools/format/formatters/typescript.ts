/**
 * TypeScript/JavaScript Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'typescript',
  name: 'TypeScript/JavaScript',
  extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'],
  tool: 'biome',
};

export default formatter;
