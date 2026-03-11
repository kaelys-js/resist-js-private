/**
 * JSON Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'json',
  name: 'JSON',
  extensions: ['.json', '.jsonc'],
  tool: 'biome',
};

export default formatter;
