/**
 * GraphQL Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'graphql',
  name: 'GraphQL',
  extensions: ['.graphql', '.gql'],
  tool: 'biome',
};

export default formatter;
