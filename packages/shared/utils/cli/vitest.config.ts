import { createNodeTestConfig } from '@/test-presets/node';

export default createNodeTestConfig({
  packageName: '@/cli',
  dirname: import.meta.dirname,
  coverageExclude: ['src/utils/tool.ts'],
});
