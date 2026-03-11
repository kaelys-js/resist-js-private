/**
 * Dart Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'dart',
  name: 'Dart',
  extensions: ['.dart'],
  tool: 'external',
  commands: [
    {
      bin: 'dart',
      formatArgs: ['dart', 'format'],
      checkArgs: ['dart', 'format', '--set-exit-if-changed', '--output=none'],
      // Note: dart format uses analysis_options.yaml from project root
      // The config file is provided for reference but dart format doesn't accept --config
      configFile: 'analysis_options.yaml',
    },
  ],
};

export default formatter;
