/**
 * Astro Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'astro',
  name: 'Astro',
  extensions: ['.astro'],
  tool: 'prettier',
  parser: 'astro',
};

export default formatter;
