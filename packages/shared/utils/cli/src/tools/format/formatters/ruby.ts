/**
 * Ruby Formatter
 *
 * @module
 */

import type { FormatterDefinition } from '@/cli/tools/format/schemas';

const formatter: FormatterDefinition = {
  id: 'ruby',
  name: 'Ruby',
  extensions: ['.rb', '.rake', '.gemspec'],
  filenames: ['Rakefile', 'Gemfile', 'Guardfile', 'Vagrantfile', 'Podfile'],
  tool: 'external',
  commands: [
    {
      bin: 'rubocop',
      formatArgs: ['rubocop', '-A'],
      checkArgs: ['rubocop', '--lint'],
      configFile: '.rubocop.yml',
      configFlag: '--config "{config}"',
    },
  ],
};

export default formatter;
