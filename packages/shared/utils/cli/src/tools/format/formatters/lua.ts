/**
 * Lua Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'lua',
  name: 'Lua',
  extensions: ['.lua'],
  tool: 'external',
  commands: [
    {
      bin: 'stylua',
      formatArgs: ['stylua'],
      checkArgs: ['stylua', '--check'],
      configFile: 'stylua.toml',
      configFlag: '--config-path "{config}"',
    },
  ],
};

export default formatter;
