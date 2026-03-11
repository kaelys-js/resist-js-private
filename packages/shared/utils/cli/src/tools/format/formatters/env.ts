/**
 * Environment File Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeEnvFile(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments
    if (trimmed.startsWith('#')) {
      result.push(trimmed);
      continue;
    }

    // Empty
    if (trimmed === '') {
      result.push('');
      continue;
    }

    // Key-value - normalize to KEY=value (no spaces around =)
    if (trimmed.includes('=')) {
      const eqIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1);
      result.push(`${key}=${value}`);
      continue;
    }

    result.push(trimmed);
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'env',
  name: 'Environment',
  filenames: [
    '.env',
    '.env.local',
    '.env.example',
    '.env.development',
    '.env.production',
    '.env.test',
  ],
  patterns: ['.env.*'],
  tool: 'custom',
  transform: normalizeEnvFile,
};

export default formatter;
