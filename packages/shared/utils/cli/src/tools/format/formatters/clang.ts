/**
 * C/C++ Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'clang',
  name: 'C/C++',
  extensions: ['.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.m', '.mm'],
  tool: 'external',
  commands: [
    {
      bin: 'clang-format',
      formatArgs: ['clang-format', '-i'],
      checkArgs: ['clang-format', '--dry-run', '--Werror'],
      configFile: '.clang-format',
      configFlag: '--style=file:{config}',
    },
  ],
};

export default formatter;
