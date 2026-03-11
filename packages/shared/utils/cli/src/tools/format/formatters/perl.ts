/**
 * Perl Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'perl',
  name: 'Perl',
  extensions: ['.pl', '.pm', '.t'],
  tool: 'external',
  commands: [
    {
      bin: 'perltidy',
      formatArgs: ['perltidy', '-b'],
      checkArgs: ['perltidy', '-st'],
      checkByDiff: true,
      configFile: '.perltidyrc',
      configFlag: '--profile="{config}"',
    },
  ],
};

export default formatter;
