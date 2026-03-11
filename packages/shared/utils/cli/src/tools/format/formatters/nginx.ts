/**
 * Nginx Config Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'nginx',
  name: 'Nginx',
  filenames: ['nginx.conf'],
  patterns: ['*.nginx', '*.nginx.conf'],
  tool: 'noop',
};

export default formatter;
