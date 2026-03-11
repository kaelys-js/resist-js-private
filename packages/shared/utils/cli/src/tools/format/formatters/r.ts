/**
 * R Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'r',
  name: 'R',
  extensions: ['.r', '.R'],
  tool: 'external',
  commands: [
    {
      bin: 'air',
      formatArgs: ['air', 'format'],
      checkArgs: ['air', 'format', '--check'],
      supportsBatching: false,
    },
    {
      bin: 'Rscript',
      formatArgs: ['sh', '-c', 'Rscript -e "styler::style_file(\\"$1\\")" --args'],
      checkArgs: [
        'sh',
        '-c',
        'Rscript -e "res <- styler::style_file(\\"$1\\", dry=\\"on\\"); if (any(res$changed)) quit(status=1)" --args',
      ],
      supportsBatching: false,
    },
  ],
};

export default formatter;
