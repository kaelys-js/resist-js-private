/**
 * Bicep Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'bicep',
  name: 'Bicep',
  extensions: ['.bicep'],
  tool: 'external',
  commands: [
    {
      bin: 'bicep',
      formatArgs: ['bicep', 'format'],
      // bicep format doesn't have check mode in older versions
      supportsBatching: false,
    },
  ],
};

export default formatter;
