/**
 * Liquid Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'liquid',
  name: 'Liquid',
  extensions: ['.liquid'],
  tool: 'noop',
};

export default formatter;
