/**
 * XML/SVG Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'xml',
  name: 'XML/SVG',
  extensions: ['.xml', '.svg', '.xsl', '.xslt'],
  tool: 'prettier',
  parser: 'xml',
};

export default formatter;
