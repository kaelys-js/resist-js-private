/**
 * Gradle Build Script Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'gradle',
  name: 'Gradle',
  extensions: ['.gradle', '.gradle.kts'],
  tool: 'noop',
};

export default formatter;
