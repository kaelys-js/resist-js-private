/**
 * V Language Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'vlang',
  name: 'V',
  extensions: ['.v'],
  tool: 'external',
  commands: [
    {
      bin: 'v',
      formatArgs: ['v', 'fmt'],
      checkArgs: ['v', 'fmt', '-verify'],
      supportsBatching: false,
    },
  ],
};

export default formatter;
