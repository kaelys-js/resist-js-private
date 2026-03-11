/**
 * Docker Compose Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'docker-compose',
  name: 'Docker Compose',
  filenames: ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'],
  patterns: ['docker-compose.*.yml', 'docker-compose.*.yaml'],
  tool: 'prettier',
  parser: 'yaml',
};

export default formatter;
