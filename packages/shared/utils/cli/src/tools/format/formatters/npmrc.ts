/**
 * NPM Config Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeNpmrc(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Preserve comments
    if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
      result.push(trimmed);
      continue;
    }

    // Key-value pairs - normalize to key=value (no spaces)
    if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      result.push(`${key.trim()}=${value}`);
      continue;
    }

    if (trimmed) {
      result.push(trimmed);
    }
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'npmrc',
  name: '.npmrc',
  filenames: ['.npmrc'],
  tool: 'custom',
  transform: normalizeNpmrc,
};

export default formatter;
