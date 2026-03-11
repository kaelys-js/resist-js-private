/**
 * Properties File Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeProperties(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
      result.push(trimmed);
      continue;
    }

    // Empty
    if (trimmed === '') {
      result.push('');
      continue;
    }

    // Key-value (supports both = and :)
    const eqIndex = trimmed.indexOf('=');
    const colonIndex = trimmed.indexOf(':');
    let sepIndex = -1;

    if (eqIndex !== -1 && colonIndex !== -1) {
      sepIndex = Math.min(eqIndex, colonIndex);
    } else if (eqIndex !== -1) {
      sepIndex = eqIndex;
    } else if (colonIndex !== -1) {
      sepIndex = colonIndex;
    }

    if (sepIndex !== -1) {
      const key = trimmed.slice(0, sepIndex).trim();
      const value = trimmed.slice(sepIndex + 1).trim();
      result.push(`${key}=${value}`);
      continue;
    }

    result.push(trimmed);
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'properties',
  name: 'Properties',
  extensions: ['.properties'],
  tool: 'custom',
  transform: normalizeProperties,
};

export default formatter;
