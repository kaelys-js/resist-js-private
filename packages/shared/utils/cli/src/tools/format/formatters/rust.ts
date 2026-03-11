/**
 * Rust Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'rust',
  name: 'Rust',
  extensions: ['.rs'],
  tool: 'external',
  commands: [
    {
      bin: 'rustfmt',
      formatArgs: ['rustfmt'],
      checkArgs: ['rustfmt', '--check'],
      configFile: 'rustfmt.toml',
      configFlag: '--config-path="{config}"',
    },
  ],
};

export default formatter;
