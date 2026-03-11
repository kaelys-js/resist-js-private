/**
 * ERB Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'erb',
  name: 'ERB',
  extensions: ['.erb'],
  tool: 'noop',
};

export default formatter;
