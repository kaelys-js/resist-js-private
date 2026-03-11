/**
 * Nix Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'nix',
  name: 'Nix',
  extensions: ['.nix'],
  tool: 'external',
  commands: [
    {
      bin: 'nixfmt',
      formatArgs: ['nixfmt'],
      checkArgs: ['nixfmt', '--check'],
      supportsBatching: false,
    },
    {
      bin: 'alejandra',
      formatArgs: ['alejandra'],
      checkArgs: ['alejandra', '--check'],
    },
  ],
};

export default formatter;
