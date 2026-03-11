/**
 * EDN Data Format Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'edn',
  name: 'EDN',
  extensions: ['.edn'],
  tool: 'noop',
};

export default formatter;
