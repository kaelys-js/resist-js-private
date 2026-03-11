/**
 * CSS Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'css',
  name: 'CSS',
  extensions: ['.css'],
  tool: 'biome',
};

export default formatter;
