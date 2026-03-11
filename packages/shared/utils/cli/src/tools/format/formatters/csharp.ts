/**
 * C# Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'csharp',
  name: 'C#',
  extensions: ['.cs'],
  tool: 'external',
  commands: [
    {
      bin: 'csharpier',
      formatArgs: ['csharpier'],
      checkArgs: ['csharpier', '--check'],
      configFile: '.csharpierrc.json',
      configFlag: '--config-path "{config}"',
    },
  ],
};

export default formatter;
