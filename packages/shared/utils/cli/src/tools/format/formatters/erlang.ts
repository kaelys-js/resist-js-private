/**
 * Erlang Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'erlang',
  name: 'Erlang',
  extensions: ['.erl', '.hrl'],
  tool: 'external',
  commands: [
    {
      bin: 'erlfmt',
      formatArgs: ['erlfmt', '-w'],
      checkArgs: ['erlfmt', '--check'],
    },
  ],
};

export default formatter;
