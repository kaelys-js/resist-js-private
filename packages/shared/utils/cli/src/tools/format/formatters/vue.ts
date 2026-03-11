/**
 * Vue Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'vue',
  name: 'Vue',
  extensions: ['.vue'],
  tool: 'prettier',
  parser: 'vue',
};

export default formatter;
