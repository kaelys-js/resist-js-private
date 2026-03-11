/**
 * Fish Shell Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'fish',
  name: 'Fish',
  extensions: ['.fish'],
  tool: 'external',
  commands: [
    {
      bin: 'fish_indent',
      formatArgs: ['fish_indent', '-w'],
      checkArgs: ['fish_indent', '-c'],
    },
  ],
};

export default formatter;
