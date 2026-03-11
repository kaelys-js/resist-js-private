/**
 * Protocol Buffers Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'protobuf',
  name: 'Protocol Buffers',
  extensions: ['.proto'],
  tool: 'external',
  commands: [
    {
      bin: 'buf',
      formatArgs: ['buf', 'format', '-w'],
      checkArgs: ['buf', 'format', '-d', '--exit-code'],
      supportsBatching: false,
    },
  ],
};

export default formatter;
