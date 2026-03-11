/**
 * PowerShell Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'powershell',
  name: 'PowerShell',
  extensions: ['.ps1', '.psm1', '.psd1'],
  tool: 'noop',
};

export default formatter;
