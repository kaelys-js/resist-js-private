/**
 * Clojure Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'clojure',
  name: 'Clojure',
  extensions: ['.clj', '.cljs', '.cljc'],
  tool: 'external',
  commands: [
    {
      bin: 'cljfmt',
      formatArgs: ['cljfmt', 'fix'],
      checkArgs: ['cljfmt', 'check'],
      configFile: '.cljfmt.edn',
      configFlag: '--config "{config}"',
    },
  ],
};

export default formatter;
