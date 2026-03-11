/**
 * Jsonnet Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'jsonnet',
  name: 'Jsonnet',
  extensions: ['.jsonnet', '.libsonnet'],
  tool: 'external',
  commands: [
    {
      bin: 'jsonnetfmt',
      formatArgs: ['jsonnetfmt', '-i'],
      checkArgs: ['jsonnetfmt', '--test'],
    },
  ],
};

export default formatter;
