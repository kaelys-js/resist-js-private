import { createNodeTestConfig } from '@/config/test/node';

export default createNodeTestConfig({
  packageName: '@/cli',
  dirname: import.meta.dirname,
  coverageExclude: ['src/utils/tool.ts'],
});
