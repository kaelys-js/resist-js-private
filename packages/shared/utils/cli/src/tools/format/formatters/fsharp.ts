/**
 * F# Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'fsharp',
  name: 'F#',
  extensions: ['.fs', '.fsi', '.fsx'],
  tool: 'external',
  commands: [
    {
      bin: 'fantomas',
      formatArgs: ['fantomas'],
      checkArgs: ['fantomas', '--check'],
    },
  ],
};

export default formatter;
