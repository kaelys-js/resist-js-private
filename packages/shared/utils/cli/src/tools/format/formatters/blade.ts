/**
 * Blade Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'blade',
  name: 'Blade',
  patterns: ['*.blade.php'],
  tool: 'external',
  commands: [
    {
      bin: 'blade-formatter',
      formatArgs: ['blade-formatter', '--write'],
      checkArgs: ['blade-formatter', '--check-formatted'],
      configFile: '.bladeformatterrc.json',
      configFlag: '--config "{config}"',
    },
  ],
};

export default formatter;
