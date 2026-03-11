/**
 * Python Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'python',
  name: 'Python',
  extensions: ['.py', '.pyi'],
  tool: 'external',
  commands: [
    {
      bin: 'ruff',
      formatArgs: ['ruff', 'format'],
      checkArgs: ['ruff', 'format', '--check'],
      configFile: 'ruff.toml',
      configFlag: '--config "{config}"',
    },
    {
      bin: 'black',
      formatArgs: ['black'],
      checkArgs: ['black', '--check', '--diff'],
    },
  ],
};

export default formatter;
