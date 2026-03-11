/**
 * Nim Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'nim',
  name: 'Nim',
  extensions: ['.nim', '.nims'],
  tool: 'external',
  commands: [
    {
      bin: 'nimpretty',
      formatArgs: ['nimpretty'],
      // nimpretty doesn't have check mode
    },
  ],
};

export default formatter;
