/**
 * TOML Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'toml',
  name: 'TOML',
  extensions: ['.toml'],
  tool: 'external',
  commands: [
    {
      bin: 'taplo',
      formatArgs: ['taplo', 'format'],
      checkArgs: ['taplo', 'format', '--check'],
      configFile: 'taplo.toml',
      configFlag: '--config "{config}"',
    },
  ],
};

export default formatter;
