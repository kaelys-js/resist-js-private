/**
 * Go Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'go',
  name: 'Go',
  extensions: ['.go'],
  tool: 'external',
  commands: [
    {
      bin: 'gofmt',
      formatArgs: ['gofmt', '-w'],
      checkArgs: ['gofmt', '-d'],
      checkByEmptyStdout: true,
    },
  ],
};

export default formatter;
