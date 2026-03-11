/**
 * PHP Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'php',
  name: 'PHP',
  extensions: ['.php'],
  tool: 'external',
  commands: [
    {
      bin: 'pint',
      formatArgs: ['pint'],
      checkArgs: ['pint', '--test'],
      supportsBatching: false,
    },
    {
      bin: 'php-cs-fixer',
      formatArgs: ['php-cs-fixer', 'fix'],
      checkArgs: ['php-cs-fixer', 'fix', '--dry-run', '--diff'],
      configFile: '.php-cs-fixer.php',
      configFlag: '--config="{config}"',
      supportsBatching: false,
    },
  ],
};

export default formatter;
