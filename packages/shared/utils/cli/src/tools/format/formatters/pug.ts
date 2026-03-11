/**
 * Pug/Jade Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'pug',
  name: 'Pug/Jade',
  extensions: ['.pug', '.jade'],
  tool: 'prettier',
  parser: 'pug',
};

export default formatter;
