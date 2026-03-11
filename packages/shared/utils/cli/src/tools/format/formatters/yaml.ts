/**
 * YAML Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'yaml',
  name: 'YAML',
  extensions: ['.yaml', '.yml'],
  tool: 'prettier',
  parser: 'yaml',
};

export default formatter;
