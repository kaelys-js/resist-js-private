/**
 * NVM Config Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeNvmrc(content: Str): Str {
  return content.trim() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'nvmrc',
  name: '.nvmrc',
  filenames: ['.nvmrc', '.node-version'],
  tool: 'custom',
  transform: normalizeNvmrc,
};

export default formatter;
