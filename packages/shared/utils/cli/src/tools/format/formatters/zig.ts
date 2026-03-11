/**
 * Zig Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'zig',
  name: 'Zig',
  extensions: ['.zig'],
  tool: 'external',
  commands: [
    {
      bin: 'zig',
      formatArgs: ['zig', 'fmt'],
      checkArgs: ['zig', 'fmt', '--check'],
    },
  ],
};

export default formatter;
