/**
 * Terraform Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'terraform',
  name: 'Terraform',
  extensions: ['.tf', '.tfvars'],
  tool: 'external',
  commands: [
    {
      bin: 'terraform',
      formatArgs: ['terraform', 'fmt'],
      checkArgs: ['terraform', 'fmt', '-check'],
      supportsBatching: false,
    },
  ],
};

export default formatter;
