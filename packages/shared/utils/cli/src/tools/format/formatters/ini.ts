/**
 * INI File Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeIni(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];
  let lastWasBlank = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
      result.push(trimmed);
      lastWasBlank = false;
      continue;
    }

    // Section headers
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (!lastWasBlank && result.length > 0) {
        result.push('');
      }
      result.push(trimmed);
      lastWasBlank = false;
      continue;
    }

    // Key-value pairs
    if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      result.push(`${key.trim()} = ${value}`);
      lastWasBlank = false;
      continue;
    }

    // Blank lines
    if (trimmed === '') {
      if (!lastWasBlank) {
        result.push('');
        lastWasBlank = true;
      }
      continue;
    }

    result.push(trimmed);
    lastWasBlank = false;
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'ini',
  name: 'INI',
  extensions: ['.ini', '.cfg'],
  tool: 'custom',
  transform: normalizeIni,
};

export default formatter;
