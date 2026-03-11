/**
 * Haskell Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'haskell',
  name: 'Haskell',
  extensions: ['.hs', '.lhs'],
  tool: 'external',
  commands: [
    {
      bin: 'ormolu',
      formatArgs: ['ormolu', '-i'],
      checkArgs: ['ormolu', '--check'],
    },
  ],
};

export default formatter;
