/**
 * SQL Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'sql',
  name: 'SQL',
  extensions: ['.sql'],
  tool: 'external',
  commands: [
    {
      bin: 'sqlfluff',
      formatArgs: ['sqlfluff', 'fix', '--force'],
      checkArgs: ['sqlfluff', 'lint'],
      configFile: '.sqlfluff',
      configFlag: '--config "{config}"',
    },
    {
      bin: 'sql-formatter',
      formatArgs: ['sql-formatter', '-o'],
      supportsBatching: false,
    },
  ],
};

export default formatter;
