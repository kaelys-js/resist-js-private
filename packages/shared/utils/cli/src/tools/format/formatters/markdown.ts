/**
 * Markdown Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'markdown',
  name: 'Markdown',
  extensions: ['.md', '.markdown', '.mdx'],
  tool: 'prettier',
  parser: 'markdown',
};

export default formatter;
