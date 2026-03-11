/**
 * SCSS/Sass/Less Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'scss',
  name: 'SCSS/Sass/Less',
  extensions: ['.scss', '.sass', '.less'],
  tool: 'prettier',
};

export default formatter;
