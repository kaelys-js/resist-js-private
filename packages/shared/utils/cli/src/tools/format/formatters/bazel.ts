/**
 * Bazel/Starlark Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'bazel',
  name: 'Bazel/Starlark',
  extensions: ['.bzl', '.sky', '.star'],
  filenames: ['BUILD', 'BUILD.bazel', 'WORKSPACE', 'WORKSPACE.bazel'],
  tool: 'external',
  commands: [
    {
      bin: 'buildifier',
      formatArgs: ['buildifier'],
      checkArgs: ['buildifier', '--mode=check'],
      configFile: '.buildifier.json',
      configFlag: '-config "{config}"',
    },
  ],
};

export default formatter;
