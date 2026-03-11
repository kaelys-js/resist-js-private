/**
 * JSON5 Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'json5',
  name: 'JSON5',
  extensions: ['.json5'],
  tool: 'prettier',
  parser: 'json5',
};

export default formatter;
