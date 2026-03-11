/**
 * Swift Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'swift',
  name: 'Swift',
  extensions: ['.swift'],
  tool: 'external',
  commands: [
    {
      bin: 'swift-format',
      formatArgs: ['swift-format', '-i'],
      checkArgs: ['swift-format', 'lint'],
      configFile: '.swift-format',
      configFlag: '--configuration "{config}"',
    },
  ],
};

export default formatter;
