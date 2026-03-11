/**
 * HCL Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'hcl',
  name: 'HCL',
  extensions: ['.hcl'],
  tool: 'external',
  commands: [
    {
      bin: 'hclfmt',
      formatArgs: ['hclfmt', '-w'],
      checkArgs: ['hclfmt', '-check'],
    },
    {
      bin: 'terraform',
      formatArgs: ['terraform', 'fmt'],
      checkArgs: ['terraform', 'fmt', '-check'],
    },
  ],
};

export default formatter;
