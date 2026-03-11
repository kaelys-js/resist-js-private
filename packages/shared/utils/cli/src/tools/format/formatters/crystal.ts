/**
 * Crystal Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'crystal',
  name: 'Crystal',
  extensions: ['.cr'],
  tool: 'external',
  commands: [
    {
      bin: 'crystal',
      formatArgs: ['crystal', 'tool', 'format'],
      checkArgs: ['crystal', 'tool', 'format', '--check'],
    },
  ],
};

export default formatter;
