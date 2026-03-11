/**
 * HTML Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'html',
  name: 'HTML',
  extensions: ['.html', '.htm'],
  tool: 'prettier',
  parser: 'html',
};

export default formatter;
