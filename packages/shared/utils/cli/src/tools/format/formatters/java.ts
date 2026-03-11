/**
 * Java Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'java',
  name: 'Java',
  extensions: ['.java'],
  tool: 'external',
  commands: [
    {
      bin: 'google-java-format',
      formatArgs: ['google-java-format', '-i'],
      checkArgs: ['google-java-format', '--dry-run', '--set-exit-if-changed'],
    },
  ],
};

export default formatter;
