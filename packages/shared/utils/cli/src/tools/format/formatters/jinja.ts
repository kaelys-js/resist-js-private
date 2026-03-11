/**
 * Jinja2/Django Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'jinja',
  name: 'Jinja2',
  extensions: ['.j2', '.jinja', '.jinja2'],
  tool: 'external',
  commands: [
    {
      bin: 'djlint',
      formatArgs: ['djlint', '--reformat'],
      checkArgs: ['djlint', '--check'],
      configFile: '.djlintrc',
    },
  ],
};

export default formatter;
