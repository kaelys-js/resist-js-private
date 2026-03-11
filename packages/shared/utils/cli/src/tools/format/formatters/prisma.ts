/**
 * Prisma Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'prisma',
  name: 'Prisma',
  extensions: ['.prisma'],
  tool: 'external',
  commands: [
    {
      bin: 'prisma',
      formatArgs: ['prisma', 'format', '--schema'],
      // prisma format doesn't have check mode
      supportsBatching: false,
    },
  ],
};

export default formatter;
