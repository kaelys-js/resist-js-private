/**
 * Scala Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'scala',
  name: 'Scala',
  extensions: ['.scala', '.sbt'],
  tool: 'external',
  commands: [
    {
      bin: 'scalafmt',
      formatArgs: ['scalafmt'],
      checkArgs: ['scalafmt', '--check'],
      configFile: '.scalafmt.conf',
      configFlag: '--config "{config}"',
    },
  ],
};

export default formatter;
