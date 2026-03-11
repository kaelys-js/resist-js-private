/**
 * Handlebars Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'handlebars',
  name: 'Handlebars',
  extensions: ['.hbs', '.handlebars'],
  tool: 'prettier',
  parser: 'glimmer',
};

export default formatter;
