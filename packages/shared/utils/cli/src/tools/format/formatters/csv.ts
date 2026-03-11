/**
 * CSV Formatter
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import type { FormatterDefinition } from '@/cli/tools/format/schemas';

function normalizeCsv(content: Str): Str {
  const lines = content.split('\n');
  const result =
    lines
      .map((line) => {
        if (line.trim() === '') return '';
        // Simple CSV - trim each cell (doesn't handle quoted fields with commas)
        return line
          .split(',')
          .map((cell) => cell.trim())
          .join(',');
      })
      .join('\n')
      .trimEnd() + '\n';

  return result;
}

const formatter: FormatterDefinition = {
  id: 'csv',
  name: 'CSV',
  extensions: ['.csv'],
  tool: 'custom',
  transform: normalizeCsv,
};

export default formatter;
