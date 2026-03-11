/**
 * Dockerfile Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'dockerfile',
  name: 'Dockerfile',
  filenames: ['Dockerfile'],
  patterns: ['Dockerfile.*', '*.dockerfile'],
  tool: 'noop',
};

export default formatter;
