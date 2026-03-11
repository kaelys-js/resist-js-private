/**
 * Elixir Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'elixir',
  name: 'Elixir',
  extensions: ['.ex', '.exs', '.heex'],
  tool: 'external',
  commands: [
    {
      bin: 'mix',
      formatArgs: ['mix', 'format'],
      checkArgs: ['mix', 'format', '--check-formatted'],
      configFile: '.formatter.exs',
      configFlag: '--dot-formatter "{config}"',
    },
  ],
};

export default formatter;
