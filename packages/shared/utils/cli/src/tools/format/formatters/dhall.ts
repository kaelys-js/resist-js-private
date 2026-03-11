/**
 * Dhall Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'dhall',
  name: 'Dhall',
  extensions: ['.dhall'],
  tool: 'external',
  commands: [
    {
      bin: 'dhall',
      formatArgs: ['dhall', 'format'],
      checkArgs: ['dhall', 'format', '--check'],
      writesStdout: true,
      supportsBatching: false,
    },
  ],
};

export default formatter;
