/**
 * GDScript Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'gdscript',
  name: 'GDScript',
  extensions: ['.gd'],
  tool: 'external',
  commands: [
    {
      bin: 'gdformat',
      formatArgs: ['gdformat'],
      checkArgs: ['gdformat', '--check'],
    },
  ],
};

export default formatter;
