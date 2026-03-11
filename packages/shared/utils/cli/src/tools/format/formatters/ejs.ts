/**
 * EJS Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'ejs',
  name: 'EJS',
  extensions: ['.ejs'],
  tool: 'prettier',
  parser: 'html',
};

export default formatter;
