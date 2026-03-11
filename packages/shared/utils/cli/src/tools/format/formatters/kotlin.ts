/**
 * Kotlin Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'kotlin',
  name: 'Kotlin',
  extensions: ['.kt', '.kts'],
  tool: 'external',
  commands: [
    {
      bin: 'ktlint',
      formatArgs: ['ktlint', '-F'],
      checkArgs: ['ktlint'],
      // ktlint reads .editorconfig for indent_style, indent_size, max_line_length
      configFile: '.editorconfig',
    },
  ],
};

export default formatter;
