/**
 * TSV Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeTsv(content: Str): Str {
  const lines = content.split('\n');
  const result =
    lines
      .map((line) => {
        if (line.trim() === '') return '';
        return line
          .split('\t')
          .map((cell) => cell.trim())
          .join('\t');
      })
      .join('\n')
      .trimEnd() + '\n';

  return result;
}

const formatter: FormatterDefinition = {
  id: 'tsv',
  name: 'TSV',
  extensions: ['.tsv'],
  tool: 'custom',
  transform: normalizeTsv,
};

export default formatter;
