/**
 * CMake Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'cmake',
  name: 'CMake',
  extensions: ['.cmake'],
  filenames: ['CMakeLists.txt'],
  tool: 'external',
  commands: [
    {
      bin: 'cmake-format',
      formatArgs: ['cmake-format', '-i'],
      checkArgs: ['cmake-format', '--check'],
      configFile: '.cmake-format.yaml',
      configFlag: '-c "{config}"',
    },
  ],
};

export default formatter;
