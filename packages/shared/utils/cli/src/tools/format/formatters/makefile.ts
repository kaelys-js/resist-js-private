/**
 * Makefile Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeMakefile(content: Str): Str {
  const lines = content.split('\n');
  const result: Str[] = [];
  let inRecipe = false;

  for (const line of lines) {
    // Empty line
    if (line.trim() === '') {
      result.push('');
      inRecipe = false;
      continue;
    }

    // Comment
    if (line.trim().startsWith('#')) {
      result.push(line.trimEnd());
      continue;
    }

    // Target line (contains : but not := and doesn't start with whitespace)
    if (
      line.includes(':') &&
      !line.includes(':=') &&
      !line.startsWith('\t') &&
      !line.startsWith(' ')
    ) {
      result.push(line.trimEnd());
      inRecipe = true;
      continue;
    }

    // Recipe line - must start with tab
    if (inRecipe && (line.startsWith('\t') || line.startsWith(' '))) {
      const lineContent = line.replace(/^[ \t]+/, '');
      result.push('\t' + lineContent);
      continue;
    }

    // Variable or other
    result.push(line.trimEnd());
    inRecipe = false;
  }

  return result.join('\n').trimEnd() + '\n';
}

const formatter: FormatterDefinition = {
  id: 'makefile',
  name: 'Makefile',
  filenames: ['Makefile', 'makefile', 'GNUmakefile'],
  tool: 'custom',
  transform: normalizeMakefile,
};

export default formatter;
