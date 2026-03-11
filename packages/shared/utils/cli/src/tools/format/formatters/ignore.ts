/**
 * Ignore File Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeIgnoreFile(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];
  let lastWasBlank = true;
  let lastWasComment = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Comments - add blank line before if not already blank/comment
    if (trimmed.startsWith('#')) {
      if (!lastWasBlank && !lastWasComment && result.length > 0) {
        result.push('');
      }
      result.push(trimmed);
      lastWasBlank = false;
      lastWasComment = true;
      continue;
    }

    // Blank lines - collapse multiple
    if (trimmed === '') {
      if (!lastWasBlank) {
        result.push('');
        lastWasBlank = true;
      }
      lastWasComment = false;
      continue;
    }

    // Patterns
    result.push(trimmed);
    lastWasBlank = false;
    lastWasComment = false;
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'ignore',
  name: 'Ignore Files',
  filenames: [
    '.gitignore',
    '.dockerignore',
    '.prettierignore',
    '.eslintignore',
    '.npmignore',
    '.formatignore',
  ],
  tool: 'custom',
  transform: normalizeIgnoreFile,
};

export default formatter;
