/**
 * Rules Viewer Tests
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { parseRulesOutput } from './rules-viewer';
import { en } from '../locale/en';

// =============================================================================
// parseRulesOutput
// =============================================================================

describe('parseRulesOutput', () => {
  it('produces markdown title', () => {
    const result = parseRulesOutput('');

    expect(result).toContain(`# ${en.rulesViewer.title}`);
  });

  it('converts section headers to H2', () => {
    const output = 'TypeScript Rules\n\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('## TypeScript Rules');
  });

  it('converts rule entries to H3 with severity', () => {
    const output = '  no-var (error)\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('### `no-var` — error');
  });

  it('marks fixable rules with wrench emoji', () => {
    const output = '  no-var (error) [fixable]\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('### `no-var` — error 🔧');
  });

  it('does not add wrench for non-fixable rules', () => {
    const output = '  no-var (warning)\n';
    const result = parseRulesOutput(output);

    expect(result).not.toContain('🔧');
  });

  it('converts description lines to paragraphs', () => {
    const output = '  no-var (error)\n    Disallow var declarations\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('Disallow var declarations');
  });

  it('converts patterns lines to bold labels', () => {
    const output = '    Patterns: *.ts, *.tsx\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('- **Patterns:** *.ts, *.tsx');
  });

  it('converts categories and stages to bold labels', () => {
    const output = '    Categories: style  Stages: lint\n';
    const result = parseRulesOutput(output);

    expect(result).toContain('- **Categories:** style');
    expect(result).toContain('- **Stages:** lint');
  });

  it('handles full rule block output', () => {
    const output = [
      'TypeScript Rules',
      '',
      '  no-var (error) [fixable]',
      '    Disallow var declarations',
      '    Patterns: *.ts, *.tsx',
      '    Categories: style  Stages: lint',
      '',
      '  prefer-const (warning)',
      '    Prefer const over let',
      '    Patterns: *.ts',
      '    Categories: best-practices  Stages: lint, format',
      '',
    ].join('\n');
    const result = parseRulesOutput(output);

    expect(result).toContain('## TypeScript Rules');
    expect(result).toContain('### `no-var` — error 🔧');
    expect(result).toContain('Disallow var declarations');
    expect(result).toContain('- **Patterns:** *.ts, *.tsx');
    expect(result).toContain('- **Categories:** style');
    expect(result).toContain('- **Stages:** lint');
    expect(result).toContain('### `prefer-const` — warning');
    expect(result).toContain('- **Stages:** lint, format');
  });
});
