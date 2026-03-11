/**
 * CUE Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'cue',
  name: 'CUE',
  extensions: ['.cue'],
  tool: 'external',
  commands: [
    {
      bin: 'cue',
      formatArgs: ['cue', 'fmt'],
      // cue fmt doesn't have check mode
    },
  ],
};

export default formatter;
