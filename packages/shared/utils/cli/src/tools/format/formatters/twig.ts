/**
 * Twig Template Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'twig',
  name: 'Twig',
  extensions: ['.twig'],
  tool: 'prettier',
  parser: 'melody',
};

export default formatter;
