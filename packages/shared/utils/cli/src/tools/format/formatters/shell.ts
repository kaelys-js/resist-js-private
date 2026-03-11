/**
 * Shell Script Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'shell',
  name: 'Shell',
  extensions: ['.sh', '.bash', '.zsh'],
  tool: 'external',
  commands: [
    {
      bin: 'shfmt',
      formatArgs: ['shfmt', '-w', '-i', '0', '-ci', '-sr'],
      checkArgs: ['shfmt', '-d'],
      checkByEmptyStdout: true,
    },
  ],
};

export default formatter;
