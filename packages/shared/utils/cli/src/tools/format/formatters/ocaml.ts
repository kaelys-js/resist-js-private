/**
 * OCaml Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'ocaml',
  name: 'OCaml',
  extensions: ['.ml', '.mli'],
  tool: 'external',
  commands: [
    {
      bin: 'ocamlformat',
      formatArgs: ['ocamlformat', '-i'],
      checkArgs: ['ocamlformat', '--check'],
      configFile: '.ocamlformat',
    },
  ],
};

export default formatter;
