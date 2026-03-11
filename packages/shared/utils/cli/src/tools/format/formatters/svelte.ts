/**
 * Svelte Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'svelte',
  name: 'Svelte',
  extensions: ['.svelte'],
  tool: 'prettier',
  parser: 'svelte',
};

export default formatter;
