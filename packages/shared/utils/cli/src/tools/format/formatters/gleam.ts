/**
 * Gleam Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'gleam',
  name: 'Gleam',
  extensions: ['.gleam'],
  tool: 'external',
  commands: [
    {
      bin: 'gleam',
      formatArgs: ['gleam', 'format'],
      checkArgs: ['gleam', 'format', '--check'],
    },
  ],
};

export default formatter;
