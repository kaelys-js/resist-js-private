/**
 * Tests for external tool transform functions and tool definitions.
 *
 * Each tool's transform function converts raw tool output
 * into LintResult[]. These tests use mock output to verify
 * correct parsing. Tool definition tests verify properties
 * and isAvailable() integration.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type * as ToolOrchestratorModule from '@/lint/framework/tool-orchestrator.ts';
import type { LintResult } from '@/lint/framework/types.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { actionlintTool, transformActionlintOutput } from './actionlint.ts';
import { asciidocTool, transformAsciidocOutput } from './asciidoc.ts';
import { astroTool, transformAstroOutput } from './astro.ts';
import { attwTool, transformAttwOutput } from './attw.ts';
import { batchTool, transformBatchOutput } from './batch.ts';
import { bazelTool, transformBazelOutput } from './bazel.ts';
import { cargoClippyTool, transformCargoClippyOutput } from './cargo-clippy.ts';
import { cargoTomlTool, checkCargoTomlSections, transformCargoTomlOutput } from './cargo-toml.ts';
import { checkstyleTool, transformCheckstyleOutput } from './checkstyle.ts';
import { clangTidyTool, transformClangTidyOutput } from './clang-tidy.ts';
import { cmakeLintTool, transformCmakeLintOutput } from './cmake.ts';
import { codeownersTool, transformCodeownersOutput, validateCodeowners } from './codeowners.ts';
import { codeownersCheckerTool, transformCodeownersCheckerOutput } from './codeowners-checker.ts';
import { commitlintTool, transformCommitlintOutput } from './commitlint.ts';
import { confTool, transformConfOutput } from './conf.ts';
import { crystalTool, transformCrystalOutput } from './crystal.ts';
import { csvTool, transformCsvOutput } from './csv.ts';
import { cueTool, transformCueOutput } from './cue.ts';
import { dependabotTool, transformDependabotOutput, validateDependabot } from './dependabot.ts';
import { dependencyCruiserTool, transformDependencyCruiserOutput } from './dependency-cruiser.ts';
import { dhallTool, transformDhallOutput } from './dhall.ts';
import { dmdTool, transformDmdOutput } from './dmd.ts';
import { dockerComposeTool, transformDockerComposeOutput } from './docker-compose.ts';
import { dotenvLinterTool, transformDotenvLinterOutput } from './dotenv-linter.ts';
import { dotnetFormatTool, transformDotnetFormatOutput } from './dotnet-format.ts';
import { editorconfigCheckerTool, transformEditorconfigOutput } from './editorconfig.ts';
import { credoTool, transformCredoOutput } from './elixir-credo.ts';
import { erlcTool, transformErlcOutput } from './erlc.ts';
import { fantomasTool, transformFantomasOutput } from './fantomas.ts';
import { fishTool, transformFishOutput } from './fish.ts';
import { gitattributesTool, transformGitattributesOutput } from './gitattributes.ts';
import {
  githubFundingTool,
  transformGithubFundingOutput,
  validateFunding,
} from './github-funding.ts';
import {
  githubIssueTemplateTool,
  transformGithubIssueTemplateOutput,
  validateIssueTemplate,
} from './github-issue-template.ts';
import { githubPrTemplateTool, transformGithubPrTemplateOutput } from './github-pr-template.ts';
import { gitleaksTool, transformGitleaksOutput } from './gitleaks.ts';
import { goModTool, transformGoModOutput } from './go-mod.ts';
import { golangciLintTool, transformGolangciLintOutput } from './golangci-lint.ts';
import { graphqlTool, transformGraphqlOutput } from './graphql.ts';
import { groovyLintTool, transformGroovyLintOutput } from './groovy-lint.ts';
import { hadolintTool, transformHadolintOutput } from './hadolint.ts';
import { handlebarsTool, transformHandlebarsOutput } from './handlebars.ts';
import { hclTool, transformHclOutput } from './hcl.ts';
import { helmLintTool, transformHelmLintOutput } from './helm-lint.ts';
import { helmValuesTool, transformHelmValuesOutput } from './helm-values.ts';
import { hlintTool, transformHlintOutput } from './hlint.ts';
import { htmlhintTool, transformHtmlhintOutput } from './htmlhint.ts';
import { ignoreFilesTool, transformIgnoreFilesOutput } from './ignore-files.ts';
import { iniTool, transformIniOutput } from './ini.ts';
import { jscpdTool, transformJscpdOutput } from './jscpd.ts';
import { jsonlintTool, transformJsonlintOutput } from './jsonlint.ts';
import { jsonnetTool, transformJsonnetOutput } from './jsonnet.ts';
import { juliaTool, transformJuliaOutput } from './julia.ts';
import { justTool, transformJustOutput } from './justfile.ts';
import { knipTool, transformKnipOutput } from './knip.ts';
import { ktlintTool, transformKtlintOutput } from './ktlint.ts';
import { kubeLinterTool, transformKubeLinterOutput } from './kube-linter.ts';
import { kubeconformTool, transformKubeconformOutput } from './kubeconform.ts';
import { chktexTool, transformChktexOutput } from './latex.ts';
import { licenseCheckerTool, transformLicenseCheckerOutput } from './license-checker.ts';
import { lockfileLintTool, transformLockfileLintOutput } from './lockfile-lint.ts';
import { lsLintTool, transformLsLintOutput } from './ls-lint.ts';
import { luacheckTool, transformLuacheckOutput } from './luacheck.ts';
import { madgeTool, transformMadgeOutput } from './madge.ts';
import { checkmakeTool, transformCheckmakeOutput } from './makefile.ts';
import { markdownlintTool, transformMarkdownlintOutput } from './markdownlint.ts';
import { moveTool, transformMoveOutput } from './move.ts';
import { mypyTool, transformMypyOutput } from './mypy.ts';
import { nimTool, transformNimOutput } from './nim.ts';
import { ninjaTool, transformNinjaOutput } from './ninja.ts';
import { nixTool, transformNixOutput } from './nix.ts';
import { nomadTool, transformNomadOutput } from './nomad.ts';
import { npmrcTool, transformNpmrcOutput } from './npmrc.ts';
import { nvmrcTool, transformNvmrcOutput } from './nvmrc.ts';
import { ocamlTool, transformOcamlOutput } from './ocaml.ts';
import { oxlintTool, transformOxlintOutput } from './oxlint.ts';
import {
  packageJsonValidatorTool,
  transformPackageJsonValidatorOutput,
  validatePackageJson,
} from './package-json-validator.ts';
import { packerTool, transformPackerOutput } from './packer.ts';
import { perlTool, transformPerlOutput } from './perl.ts';
import { phpTool, transformPhpOutput } from './php.ts';
import { powershellTool, transformPowershellOutput } from './powershell.ts';
import { propertiesTool, transformPropertiesOutput } from './properties.ts';
import { protobufTool, transformProtobufOutput } from './protobuf.ts';
import { publintTool, transformPublintOutput } from './publint.ts';
import {
  checkPyprojectTomlSections,
  pyprojectTomlTool,
  transformPyprojectTomlOutput,
} from './pyproject-toml.ts';
import { reasonTool, transformReasonOutput } from './reason.ts';
import { rscriptTool, transformRscriptOutput } from './rscript.ts';
import { rstcheckTool, transformRstcheckOutput } from './rstcheck.ts';
import { rubocopTool, transformRubocopOutput } from './rubocop.ts';
import { ruffTool, transformRuffOutput } from './ruff.ts';
import { scalafmtTool, transformScalafmtOutput } from './scalafmt.ts';
import { sentinelTool, transformSentinelOutput } from './sentinel.ts';
import { shellcheckTool, transformShellcheckOutput } from './shellcheck.ts';
import { solhintTool, transformSolhintOutput } from './solidity.ts';
import { sortPackageJsonTool, transformSortPackageJsonOutput } from './sort-package-json.ts';
import { sqlfluffTool, transformSqlfluffOutput } from './sqlfluff.ts';
import { stylelintTool, transformStylelintOutput } from './stylelint.ts';
import { svglintTool, transformSvglintOutput } from './svglint.ts';
import { swiftlintTool, transformSwiftlintOutput } from './swiftlint.ts';
import { syncpackTool, transformSyncpackOutput } from './syncpack.ts';
import { taploTool, transformTaploOutput } from './taplo.ts';
import { terraformTool, transformTerraformOutput } from './terraform.ts';
import { thriftTool, transformThriftOutput } from './thrift.ts';
import { transformTrufflehogOutput, trufflehogTool } from './trufflehog.ts';
import { transformTyposOutput, typosTool } from './typos.ts';
import { transformVbOutput, vbTool } from './vb.ts';
import { transformVlangOutput, vlangTool } from './vlang.ts';
import { transformVyperOutput, vyperTool } from './vyper.ts';
import { transformWatOutput, watTool } from './wat.ts';
import { transformXmlOutput, xmlTool } from './xml.ts';
import { transformYamllintOutput, yamllintTool } from './yamllint.ts';
import { transformZigOutput, zigTool } from './zig.ts';
import { transformZshOutput, zshTool } from './zsh.ts';
import { svelteCheckTool, transformSvelteCheckOutput } from './svelte-check.ts';
import { tsgoTool, transformTsgoOutput } from './tsgo.ts';

// Mock isCommandAvailable to avoid real `which` calls
vi.mock('@/lint/framework/tool-orchestrator.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof ToolOrchestratorModule>();
  return {
    ...actual,
    isCommandAvailable: vi.fn().mockResolvedValue(true),
  };
});

// =============================================================================
// ShellCheck transform
// =============================================================================

describe('transformShellcheckOutput', () => {
  it('parses JSON output with issues', () => {
    const output: string = JSON.stringify([
      {
        code: 2086,
        column: 3,
        endColumn: 10,
        endLine: 5,
        file: 'script.sh',
        level: 'warning',
        line: 5,
        message: 'Double quote to prevent globbing and word splitting.',
      },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('shellcheck/SC2086');
    expect(results[0]?.file).toBe('script.sh');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('Double quote');
  });

  it('handles error level', () => {
    const output: string = JSON.stringify([
      {
        code: 1091,
        column: 1,
        file: 'script.sh',
        level: 'error',
        line: 1,
        message: 'Not following: /path/to/file was not found.',
      },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformShellcheckOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformShellcheckOutput('not json', en)).toHaveLength(0);
  });

  it('parses multiple items', () => {
    const output: string = JSON.stringify([
      { code: 2001, column: 1, file: 'a.sh', level: 'warning', line: 1, message: 'msg1' },
      { code: 2002, column: 1, file: 'b.sh', level: 'error', line: 2, message: 'msg2' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// Hadolint transform
// =============================================================================

describe('transformHadolintOutput', () => {
  it('parses JSON output with issues', () => {
    const output: string = JSON.stringify([
      {
        code: 'DL3008',
        column: 1,
        file: 'Dockerfile',
        level: 'warning',
        line: 3,
        message: 'Pin versions in apt get install.',
      },
    ]);

    const results: LintResult[] = transformHadolintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hadolint/DL3008');
    expect(results[0]?.file).toBe('Dockerfile');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('Pin versions');
  });

  it('returns empty array for empty output', () => {
    expect(transformHadolintOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformHadolintOutput('invalid', en)).toHaveLength(0);
  });
});

// =============================================================================
// yamllint transform
// =============================================================================

describe('transformYamllintOutput', () => {
  it('parses parsable output format', () => {
    const output: string = 'config.yml:3:1: [warning] too many blank lines (1 > 0) (empty-lines)';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('yamllint/yaml');
    expect(results[0]?.file).toBe('config.yml');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles error level', () => {
    const output: string = 'file.yml:10:5: [error] syntax error: expected a mapping value';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformYamllintOutput('')).toHaveLength(0);
  });

  it('handles multiple lines', () => {
    const output: string = 'a.yml:1:1: [warning] msg1\nb.yml:2:3: [error] msg2\n';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// markdownlint transform
// =============================================================================

describe('transformMarkdownlintOutput', () => {
  it('parses output with line and column', () => {
    const output: string =
      'README.md:5:1 MD022/blanks-around-headings Headings should be surrounded by blank lines';

    const results: LintResult[] = transformMarkdownlintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('markdownlint/MD022');
    expect(results[0]?.file).toBe('README.md');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses output with line only (no column)', () => {
    const output: string =
      'README.md:3 MD012/no-multiple-blanks Multiple consecutive blank lines [Expected: 1; Actual: 2]';

    const results: LintResult[] = transformMarkdownlintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('markdownlint/MD012');
    expect(results[0]?.column).toBe(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformMarkdownlintOutput('', en)).toHaveLength(0);
  });

  it('handles multiple issues', () => {
    const output: string =
      'a.md:1:1 MD001/heading-increment Heading levels should only increment by one level at a time\n' +
      'a.md:5:1 MD022/blanks-around-headings Headings should be surrounded by blank lines\n';

    const results: LintResult[] = transformMarkdownlintOutput(output, en);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// Stylelint transform
// =============================================================================

describe('transformStylelintOutput', () => {
  it('parses JSON output with warnings', () => {
    const output: string = JSON.stringify([
      {
        source: 'src/styles.css',
        warnings: [
          {
            column: 3,
            line: 5,
            rule: 'color-no-invalid-hex',
            severity: 'error',
            text: 'Unexpected invalid hex color "#xyz" (color-no-invalid-hex)',
          },
        ],
      },
    ]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('stylelint/color-no-invalid-hex');
    expect(results[0]?.file).toBe('src/styles.css');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformStylelintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformStylelintOutput('not json')).toHaveLength(0);
  });
});

// =============================================================================
// Taplo transform
// =============================================================================

describe('transformTaploOutput', () => {
  it('parses error output', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> config.toml:3:1';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('taplo/expected_equals');
    expect(results[0]?.file).toBe('config.toml');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformTaploOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// actionlint transform
// =============================================================================

describe('transformActionlintOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify([
      {
        column: 1,
        filepath: '.github/workflows/ci.yml',
        kind: 'syntax-check',
        line: 1,
        message: 'unexpected key "on"',
        snippet: 'on: push',
      },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('actionlint/syntax-check');
    expect(results[0]?.file).toBe('.github/workflows/ci.yml');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformActionlintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformActionlintOutput('invalid')).toHaveLength(0);
  });
});

// =============================================================================
// SQLFluff transform
// =============================================================================

describe('transformSqlfluffOutput', () => {
  it('parses JSON output with violations', () => {
    const output: string = JSON.stringify([
      {
        filepath: 'query.sql',
        violations: [
          {
            code: 'L010',
            description: 'Keywords should be consistently capitalised.',
            start_line_no: 10,
            start_line_pos: 5,
          },
        ],
      },
    ]);

    const results: LintResult[] = transformSqlfluffOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sqlfluff/L010');
    expect(results[0]?.file).toBe('query.sql');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSqlfluffOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformSqlfluffOutput('invalid', en)).toHaveLength(0);
  });
});

// =============================================================================
// Ruff transform
// =============================================================================

describe('transformRuffOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify([
      {
        code: 'E501',
        end_location: { column: 121, row: 15 },
        filename: 'script.py',
        location: { column: 1, row: 15 },
        message: 'Line too long (120 > 88 characters)',
      },
    ]);

    const results: LintResult[] = transformRuffOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ruff/E501');
    expect(results[0]?.file).toBe('script.py');
    expect(results[0]?.line).toBe(15);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformRuffOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformRuffOutput('invalid', en)).toHaveLength(0);
  });

  it('handles missing location fields with defaults', () => {
    const output: string = JSON.stringify([
      { code: 'F401', filename: 'x.py', message: 'unused import' },
    ]);

    const results: LintResult[] = transformRuffOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
  });

  it('handles missing code with "unknown" fallback', () => {
    const output: string = JSON.stringify([
      { filename: 'x.py', location: { column: 1, row: 1 }, message: 'msg' },
    ]);

    const results: LintResult[] = transformRuffOutput(output, en);
    expect(results[0]?.ruleId).toBe('ruff/unknown');
  });
});

// =============================================================================
// Tool definition property tests
// =============================================================================

describe('tool definitions', () => {
  it('shellcheckTool has correct properties', () => {
    expect(shellcheckTool.name).toBe('shellcheck');
    expect(shellcheckTool.command).toBe('shellcheck');
    expect(shellcheckTool.args).toContain('--format=json');
    expect(shellcheckTool.outputFormat).toBe('json');
    expect(shellcheckTool.filePatterns).toContain('**/*.sh');
    expect(shellcheckTool.filePatterns).toContain('**/*.bash');
    expect(shellcheckTool.filePatterns).toContain('**/*.zsh');
    expect(shellcheckTool.transform).toBe(transformShellcheckOutput);
  });

  it('hadolintTool has correct properties', () => {
    expect(hadolintTool.name).toBe('hadolint');
    expect(hadolintTool.command).toBe('hadolint');
    expect(hadolintTool.outputFormat).toBe('json');
    expect(hadolintTool.filePatterns).toContain('Dockerfile');
    expect(hadolintTool.transform).toBe(transformHadolintOutput);
  });

  it('yamllintTool has correct properties', () => {
    expect(yamllintTool.name).toBe('yamllint');
    expect(yamllintTool.command).toBe('yamllint');
    expect(yamllintTool.outputFormat).toBe('text');
    expect(yamllintTool.filePatterns).toContain('**/*.yaml');
    expect(yamllintTool.filePatterns).toContain('**/*.yml');
    expect(yamllintTool.transform).toBe(transformYamllintOutput);
  });

  it('markdownlintTool has correct properties', () => {
    expect(markdownlintTool.name).toBe('markdownlint');
    expect(markdownlintTool.command).toBe('markdownlint-cli2');
    expect(markdownlintTool.outputFormat).toBe('text');
    expect(markdownlintTool.filePatterns).toContain('**/*.md');
    expect(markdownlintTool.filePatterns).toContain('**/*.mdx');
    expect(markdownlintTool.transform).toBe(transformMarkdownlintOutput);
  });

  it('stylelintTool has correct properties', () => {
    expect(stylelintTool.name).toBe('stylelint');
    expect(stylelintTool.command).toBe('stylelint');
    expect(stylelintTool.outputFormat).toBe('json');
    expect(stylelintTool.filePatterns).toContain('**/*.css');
    expect(stylelintTool.filePatterns).toContain('**/*.scss');
    expect(stylelintTool.filePatterns).toContain('**/*.less');
    expect(stylelintTool.transform).toBe(transformStylelintOutput);
  });

  it('taploTool has correct properties', () => {
    expect(taploTool.name).toBe('taplo');
    expect(taploTool.command).toBe('taplo');
    expect(taploTool.outputFormat).toBe('text');
    expect(taploTool.filePatterns).toContain('**/*.toml');
    expect(taploTool.transform).toBe(transformTaploOutput);
  });

  it('actionlintTool has correct properties', () => {
    expect(actionlintTool.name).toBe('actionlint');
    expect(actionlintTool.command).toBe('actionlint');
    expect(actionlintTool.outputFormat).toBe('json');
    expect(actionlintTool.filePatterns).toContain('**/.github/workflows/*.yml');
    expect(actionlintTool.transform).toBe(transformActionlintOutput);
  });

  it('sqlfluffTool has correct properties', () => {
    expect(sqlfluffTool.name).toBe('sqlfluff');
    expect(sqlfluffTool.command).toBe('sqlfluff');
    expect(sqlfluffTool.outputFormat).toBe('json');
    expect(sqlfluffTool.filePatterns).toContain('**/*.sql');
    expect(sqlfluffTool.transform).toBe(transformSqlfluffOutput);
  });

  it('ruffTool has correct properties', () => {
    expect(ruffTool.name).toBe('ruff');
    expect(ruffTool.command).toBe('ruff');
    expect(ruffTool.outputFormat).toBe('json');
    expect(ruffTool.filePatterns).toContain('**/*.py');
    expect(ruffTool.transform).toBe(transformRuffOutput);
  });
});

// =============================================================================
// Tool isAvailable() tests
// =============================================================================

describe('tool isAvailable()', () => {
  it('shellcheckTool.isAvailable resolves', async () => {
    const result = await shellcheckTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('hadolintTool.isAvailable resolves', async () => {
    const result = await hadolintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('yamllintTool.isAvailable resolves', async () => {
    const result = await yamllintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('markdownlintTool.isAvailable resolves', async () => {
    const result = await markdownlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('stylelintTool.isAvailable resolves', async () => {
    const result = await stylelintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('taploTool.isAvailable resolves', async () => {
    const result = await taploTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('actionlintTool.isAvailable resolves', async () => {
    const result = await actionlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('sqlfluffTool.isAvailable resolves', async () => {
    const result = await sqlfluffTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('ruffTool.isAvailable resolves', async () => {
    const result = await ruffTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Transform edge cases — uncovered branches
// =============================================================================

describe('transform edge cases', () => {
  it('shellcheck handles info level', () => {
    const output: string = JSON.stringify([
      { code: 1000, column: 1, file: 'a.sh', level: 'info', line: 1, message: 'note' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results[0]?.severity).toBe('info');
  });

  it('shellcheck handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{}]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.ruleId).toBe('shellcheck/SC0');
  });

  it('hadolint handles info level', () => {
    const output: string = JSON.stringify([
      { code: 'DL0', column: 1, file: 'Dockerfile', level: 'info', line: 1, message: 'info' },
    ]);

    const results: LintResult[] = transformHadolintOutput(output, en);
    expect(results[0]?.severity).toBe('info');
  });

  it('hadolint handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{}]);

    const results: LintResult[] = transformHadolintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('Dockerfile');
    expect(results[0]?.severity).toBe('warning');
  });

  it('yamllint skips non-matching lines', () => {
    const output: string = 'some random text\nconfig.yml:1:1: [warning] msg\nanother line';

    const results: LintResult[] = transformYamllintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('markdownlint skips non-matching lines', () => {
    const output: string = 'random header\nREADME.md:1:1 MD001/heading-increment msg\nfooter';

    const results: LintResult[] = transformMarkdownlintOutput(output, en);
    expect(results).toHaveLength(1);
  });

  it('stylelint handles warning severity', () => {
    const output: string = JSON.stringify([
      {
        source: 'a.css',
        warnings: [{ column: 1, line: 1, rule: 'r', severity: 'warning', text: 'warn' }],
      },
    ]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('stylelint handles empty warnings array', () => {
    const output: string = JSON.stringify([{ source: 'a.css', warnings: [] }]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(0);
  });

  it('stylelint handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ source: 'a.css', warnings: [{}] }]);

    const results: LintResult[] = transformStylelintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('stylelint/unknown');
    expect(results[0]?.severity).toBe('warning');
  });

  it('taplo handles warning level', () => {
    const output: string = 'warning[deprecated_key]: key is deprecated  --> config.toml:5:3';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.ruleId).toBe('taplo/deprecated_key');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(3);
  });

  it('taplo handles multiple lines', () => {
    const output: string = 'error[e1]: msg1  --> a.toml:1:1\nwarning[w1]: msg2  --> b.toml:2:3\n';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(2);
  });

  it('taplo skips non-matching lines', () => {
    const output: string = 'random text\nerror[e1]: msg  --> a.toml:1:1\nmore text';

    const results: LintResult[] = transformTaploOutput(output);
    expect(results).toHaveLength(1);
  });

  it('actionlint handles missing kind with default', () => {
    const output: string = JSON.stringify([
      { column: 1, filepath: 'ci.yml', line: 1, message: 'msg' },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results[0]?.ruleId).toBe('actionlint/syntax-check');
  });

  it('actionlint includes source snippet', () => {
    const output: string = JSON.stringify([
      { column: 1, filepath: 'ci.yml', kind: 'k', line: 1, message: 'msg', snippet: 'code here' },
    ]);

    const results: LintResult[] = transformActionlintOutput(output);
    expect(results[0]?.source).toBe('code here');
  });

  it('sqlfluff handles multiple files with violations', () => {
    const output: string = JSON.stringify([
      {
        filepath: 'a.sql',
        violations: [{ code: 'L001', description: 'msg1', start_line_no: 1, start_line_pos: 1 }],
      },
      {
        filepath: 'b.sql',
        violations: [{ code: 'L002', description: 'msg2', start_line_no: 5, start_line_pos: 3 }],
      },
    ]);

    const results: LintResult[] = transformSqlfluffOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.file).toBe('a.sql');
    expect(results[1]?.file).toBe('b.sql');
  });

  it('sqlfluff handles empty violations array', () => {
    const output: string = JSON.stringify([{ filepath: 'a.sql', violations: [] }]);

    const results: LintResult[] = transformSqlfluffOutput(output, en);
    expect(results).toHaveLength(0);
  });

  it('sqlfluff handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ filepath: 'a.sql', violations: [{}] }]);

    const results: LintResult[] = transformSqlfluffOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sqlfluff/unknown');
    expect(results[0]?.line).toBe(1);
  });

  it('ruff includes tip with documentation URL', () => {
    const output: string = JSON.stringify([
      { code: 'E501', filename: 'x.py', location: { column: 1, row: 1 }, message: 'msg' },
    ]);

    const results: LintResult[] = transformRuffOutput(output, en);
    expect(results[0]?.tip).toContain('https://docs.astral.sh/ruff/rules/E501');
  });

  it('shellcheck includes tip with wiki URL', () => {
    const output: string = JSON.stringify([
      { code: 2086, column: 1, file: 'a.sh', level: 'warning', line: 1, message: 'msg' },
    ]);

    const results: LintResult[] = transformShellcheckOutput(output, en);
    expect(results[0]?.tip).toContain('https://www.shellcheck.net/wiki/SC2086');
  });

  it('hadolint includes tip with wiki URL', () => {
    const output: string = JSON.stringify([
      { code: 'DL3008', column: 1, file: 'Dockerfile', level: 'warning', line: 1, message: 'msg' },
    ]);

    const results: LintResult[] = transformHadolintOutput(output, en);
    expect(results[0]?.tip).toContain('https://github.com/hadolint/hadolint/wiki/DL3008');
  });

  it('shellcheck whitespace-only output returns empty', () => {
    expect(transformShellcheckOutput('   \n  ', en)).toHaveLength(0);
  });

  it('hadolint whitespace-only output returns empty', () => {
    expect(transformHadolintOutput('   \n  ', en)).toHaveLength(0);
  });

  it('stylelint whitespace-only output returns empty', () => {
    expect(transformStylelintOutput('   \n  ')).toHaveLength(0);
  });

  it('ruff whitespace-only output returns empty', () => {
    expect(transformRuffOutput('   \n  ', en)).toHaveLength(0);
  });

  it('typos whitespace-only output returns empty', () => {
    expect(transformTyposOutput('   \n  ', en)).toHaveLength(0);
  });

  it('htmlhint whitespace-only output returns empty', () => {
    expect(transformHtmlhintOutput('   \n  ', en)).toHaveLength(0);
  });

  it('dotenv-linter whitespace-only output returns empty', () => {
    expect(transformDotenvLinterOutput('   \n  ', en)).toHaveLength(0);
  });

  it('knip whitespace-only output returns empty', () => {
    expect(transformKnipOutput('   \n  ', en)).toHaveLength(0);
  });

  it('commitlint whitespace-only output returns empty', () => {
    expect(transformCommitlintOutput('   \n  ')).toHaveLength(0);
  });

  it('jsonlint whitespace-only output returns empty', () => {
    expect(transformJsonlintOutput('   \n  ', en)).toHaveLength(0);
  });
});

// =============================================================================
// typos transform
// =============================================================================

describe('transformTyposOutput', () => {
  it('parses JSONL output with typos', () => {
    const output: string =
      '{"type":"typo","path":"src/foo.ts","line_num":10,"byte_offset":5,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('typos/misspelling');
    expect(results[0]?.file).toBe('src/foo.ts');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(6);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('teh');
    expect(results[0]?.message).toContain('the');
  });

  it('skips non-typo entries', () => {
    const output: string = [
      '{"type":"binary","path":"image.png"}',
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"nto","corrections":["not","into"]}',
    ].join('\n');

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('nto');
  });

  it('handles multiple corrections', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"fo","corrections":["of","for","do"]}';

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results[0]?.message).toContain('of, for, do');
  });

  it('returns empty array for empty output', () => {
    expect(transformTyposOutput('', en)).toHaveLength(0);
  });

  it('handles invalid JSON lines gracefully', () => {
    const output: string =
      'not json\n{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results).toHaveLength(1);
  });

  it('includes tip with fix suggestion', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"teh","corrections":["the"]}';

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results[0]?.tip).toContain('teh');
    expect(results[0]?.tip).toContain('the');
  });

  it('handles empty corrections array', () => {
    const output: string =
      '{"type":"typo","path":"a.ts","line_num":1,"byte_offset":0,"typo":"xyz","corrections":[]}';

    const results: LintResult[] = transformTyposOutput(output, en);
    expect(results[0]?.message).toContain('unknown');
  });
});

// =============================================================================
// commitlint transform
// =============================================================================

describe('transformCommitlintOutput', () => {
  it('parses error output', () => {
    const output: string = '✖   subject may not be empty [subject-empty]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('commitlint/subject-empty');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('subject may not be empty');
  });

  it('parses warning output', () => {
    const output: string = '⚠   header must not be longer than 72 characters [header-max-length]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('commitlint/header-max-length');
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles multiple issues', () => {
    const output: string =
      '✖   subject may not be empty [subject-empty]\n⚠   body must have leading blank line [body-leading-blank]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips non-matching lines', () => {
    const output: string =
      'input: some commit message\n✖   subject may not be empty [subject-empty]\n\nfound 1 problems, 0 warnings';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformCommitlintOutput('')).toHaveLength(0);
  });

  it('sets file to .git/COMMIT_EDITMSG', () => {
    const output: string = '✖   type must be one of [feat, fix] [type-enum]';

    const results: LintResult[] = transformCommitlintOutput(output);
    expect(results[0]?.file).toBe('.git/COMMIT_EDITMSG');
  });
});

// =============================================================================
// knip transform
// =============================================================================

describe('transformKnipOutput', () => {
  it('parses unused files', () => {
    const output: string = JSON.stringify({
      files: ['src/unused.ts', 'src/dead-code.ts'],
      issues: [],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('knip/unused-file');
    expect(results[0]?.file).toBe('src/unused.ts');
    expect(results[1]?.file).toBe('src/dead-code.ts');
  });

  it('parses unused exports', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        { col: 14, filePath: 'src/utils.ts', line: 42, symbol: 'helperFn', type: 'exports' },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('knip/unused-export');
    expect(results[0]?.file).toBe('src/utils.ts');
    expect(results[0]?.line).toBe(42);
    expect(results[0]?.message).toContain('helperFn');
  });

  it('parses unused types', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [{ col: 1, filePath: 'src/types.ts', line: 5, symbol: 'OldType', type: 'types' }],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results[0]?.ruleId).toBe('knip/unused-type');
  });

  it('parses unused dependencies', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        { col: 1, filePath: 'package.json', line: 1, symbol: 'lodash', type: 'dependencies' },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results[0]?.ruleId).toBe('knip/unused-dependency');
  });

  it('parses unused devDependencies', () => {
    const output: string = JSON.stringify({
      files: [],
      issues: [
        {
          col: 1,
          filePath: 'package.json',
          line: 1,
          symbol: 'jest',
          type: 'devDependencies',
        },
      ],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results[0]?.ruleId).toBe('knip/unused-dev-dependency');
  });

  it('returns empty array for empty output', () => {
    expect(transformKnipOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformKnipOutput('not json', en)).toHaveLength(0);
  });

  it('handles missing fields with defaults', () => {
    const output: string = JSON.stringify({
      issues: [{ filePath: 'a.ts', type: 'other' }],
    });

    const results: LintResult[] = transformKnipOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('knip/unused');
    expect(results[0]?.line).toBe(1);
  });
});

// =============================================================================
// HTMLHint transform
// =============================================================================

describe('transformHtmlhintOutput', () => {
  it('parses JSON output with messages', () => {
    const output: string = JSON.stringify([
      {
        file: 'index.html',
        messages: [
          {
            col: 1,
            line: 1,
            message: 'Doctype must be declared first.',
            rule: { id: 'doctype-first' },
            type: 'error',
          },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('htmlhint/doctype-first');
    expect(results[0]?.file).toBe('index.html');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('handles warning severity', () => {
    const output: string = JSON.stringify([
      {
        file: 'page.html',
        messages: [
          {
            col: 3,
            line: 5,
            message: 'Tag must be paired.',
            rule: { id: 'tag-pair' },
            type: 'warning',
          },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles info severity', () => {
    const output: string = JSON.stringify([
      {
        file: 'page.html',
        messages: [{ col: 1, line: 1, message: 'Info msg', rule: { id: 'rule' }, type: 'info' }],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results[0]?.severity).toBe('info');
  });

  it('handles multiple files and messages', () => {
    const output: string = JSON.stringify([
      {
        file: 'a.html',
        messages: [
          { col: 1, line: 1, message: 'msg1', rule: { id: 'r1' }, type: 'error' },
          { col: 3, line: 5, message: 'msg2', rule: { id: 'r2' }, type: 'warning' },
        ],
      },
      {
        file: 'b.html',
        messages: [{ col: 1, line: 10, message: 'msg3', rule: { id: 'r3' }, type: 'error' }],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty output', () => {
    expect(transformHtmlhintOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformHtmlhintOutput('not json', en)).toHaveLength(0);
  });

  it('handles missing fields with defaults', () => {
    const output: string = JSON.stringify([{ file: 'a.html', messages: [{}] }]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('htmlhint/unknown');
    expect(results[0]?.severity).toBe('warning');
  });

  it('includes tip with documentation URL', () => {
    const output: string = JSON.stringify([
      {
        file: 'a.html',
        messages: [
          { col: 1, line: 1, message: 'msg', rule: { id: 'doctype-first' }, type: 'error' },
        ],
      },
    ]);

    const results: LintResult[] = transformHtmlhintOutput(output, en);
    expect(results[0]?.tip).toContain('https://htmlhint.com/docs/user-guide/rules/doctype-first');
  });
});

// =============================================================================
// jsonlint transform
// =============================================================================

describe('transformJsonlintOutput', () => {
  it('parses compact format output', () => {
    const output: string = 'config.json: line 5, col 10, Error - Expected comma';

    const results: LintResult[] = transformJsonlintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jsonlint/parse-error');
    expect(results[0]?.file).toBe('config.json');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(10);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('Expected comma');
  });

  it('parses warning level in compact format', () => {
    const output: string = 'data.json: line 3, col 1, Warning - Trailing comma';

    const results: LintResult[] = transformJsonlintOutput(output, en);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses standard format output', () => {
    const output: string =
      "Error: Parse error on line 5:\n...some context...\nExpecting 'STRING', got 'EOF'";

    const results: LintResult[] = transformJsonlintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jsonlint/parse-error');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('handles multiple compact format lines', () => {
    const output: string =
      'a.json: line 1, col 5, Error - msg1\nb.json: line 10, col 2, Error - msg2';

    const results: LintResult[] = transformJsonlintOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('returns empty array for empty output', () => {
    expect(transformJsonlintOutput('', en)).toHaveLength(0);
  });

  it('skips non-matching lines', () => {
    const output: string =
      'Validating files...\nconfig.json: line 5, col 10, Error - Bad token\nDone.';

    const results: LintResult[] = transformJsonlintOutput(output, en);
    expect(results).toHaveLength(1);
  });
});

// =============================================================================
// dotenv-linter transform
// =============================================================================

describe('transformDotenvLinterOutput', () => {
  it('parses output with issues', () => {
    const output: string = '.env:3 DuplicatedKey: The FOO key is duplicated';

    const results: LintResult[] = transformDotenvLinterOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dotenv-linter/DuplicatedKey');
    expect(results[0]?.file).toBe('.env');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('FOO key is duplicated');
  });

  it('handles multiple issues', () => {
    const output: string =
      '.env:1 LeadingCharacter: Invalid leading character detected\n.env:5 DuplicatedKey: The BAR key is duplicated';

    const results: LintResult[] = transformDotenvLinterOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('handles .env.production files', () => {
    const output: string = '.env.production:10 UnorderedKey: The keys should go in order';

    const results: LintResult[] = transformDotenvLinterOutput(output, en);
    expect(results[0]?.file).toBe('.env.production');
    expect(results[0]?.line).toBe(10);
  });

  it('skips non-matching lines', () => {
    const output: string = 'Checking .env files...\n.env:1 DuplicatedKey: msg\nDone.';

    const results: LintResult[] = transformDotenvLinterOutput(output, en);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformDotenvLinterOutput('', en)).toHaveLength(0);
  });

  it('includes tip with documentation URL', () => {
    const output: string = '.env:1 DuplicatedKey: msg';

    const results: LintResult[] = transformDotenvLinterOutput(output, en);
    expect(results[0]?.tip).toContain('https://dotenv-linter.github.io/#/checks/DuplicatedKey');
  });
});

// =============================================================================
// New tool definition property tests
// =============================================================================

describe('new tool definitions', () => {
  it('typosTool has correct properties', () => {
    expect(typosTool.name).toBe('typos');
    expect(typosTool.command).toBe('typos');
    expect(typosTool.args).toContain('--format');
    expect(typosTool.args).toContain('json');
    expect(typosTool.outputFormat).toBe('json');
    expect(typosTool.filePatterns).toContain('**/*');
    expect(typosTool.transform).toBe(transformTyposOutput);
  });

  it('commitlintTool has correct properties', () => {
    expect(commitlintTool.name).toBe('commitlint');
    expect(commitlintTool.command).toBe('commitlint');
    expect(commitlintTool.args).toContain('--from');
    expect(commitlintTool.outputFormat).toBe('text');
    expect(commitlintTool.filePatterns).toHaveLength(0);
    expect(commitlintTool.transform).toBe(transformCommitlintOutput);
  });

  it('knipTool has correct properties', () => {
    expect(knipTool.name).toBe('knip');
    expect(knipTool.command).toBe('knip');
    expect(knipTool.args).toContain('--reporter');
    expect(knipTool.args).toContain('json');
    expect(knipTool.outputFormat).toBe('json');
    expect(knipTool.filePatterns).toHaveLength(0);
    expect(knipTool.transform).toBe(transformKnipOutput);
  });

  it('htmlhintTool has correct properties', () => {
    expect(htmlhintTool.name).toBe('htmlhint');
    expect(htmlhintTool.command).toBe('htmlhint');
    expect(htmlhintTool.args).toContain('--format');
    expect(htmlhintTool.outputFormat).toBe('json');
    expect(htmlhintTool.filePatterns).toContain('**/*.html');
    expect(htmlhintTool.filePatterns).toContain('**/*.htm');
    expect(htmlhintTool.transform).toBe(transformHtmlhintOutput);
  });

  it('jsonlintTool has correct properties', () => {
    expect(jsonlintTool.name).toBe('jsonlint');
    expect(jsonlintTool.command).toBe('jsonlint');
    expect(jsonlintTool.args).toContain('--quiet');
    expect(jsonlintTool.outputFormat).toBe('text');
    expect(jsonlintTool.filePatterns).toContain('**/*.json');
    expect(jsonlintTool.filePatterns).toContain('**/*.jsonc');
    expect(jsonlintTool.transform).toBe(transformJsonlintOutput);
  });

  it('dotenvLinterTool has correct properties', () => {
    expect(dotenvLinterTool.name).toBe('dotenv-linter');
    expect(dotenvLinterTool.command).toBe('dotenv-linter');
    expect(dotenvLinterTool.outputFormat).toBe('text');
    expect(dotenvLinterTool.filePatterns).toContain('**/.env');
    expect(dotenvLinterTool.filePatterns).toContain('**/.env.*');
    expect(dotenvLinterTool.transform).toBe(transformDotenvLinterOutput);
  });
});

// =============================================================================
// New tool isAvailable() tests
// =============================================================================

describe('new tool isAvailable()', () => {
  it('typosTool.isAvailable resolves', async () => {
    const result = await typosTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('commitlintTool.isAvailable resolves', async () => {
    const result = await commitlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('knipTool.isAvailable resolves', async () => {
    const result = await knipTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('htmlhintTool.isAvailable resolves', async () => {
    const result = await htmlhintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('jsonlintTool.isAvailable resolves', async () => {
    const result = await jsonlintTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });

  it('dotenvLinterTool.isAvailable resolves', async () => {
    const result = await dotenvLinterTool.isAvailable?.();
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// Asciidoctor transform
// =============================================================================

describe('transformAsciidocOutput', () => {
  it('parses warning output', () => {
    const output: string = 'asciidoctor: WARNING: guide.adoc:12: unterminated listing block';
    const results: LintResult[] = transformAsciidocOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('asciidoctor/check');
    expect(results[0]?.file).toBe('guide.adoc');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses error output', () => {
    const output: string = 'asciidoctor: ERROR: manual.adoc:5: include file not found';
    const results: LintResult[] = transformAsciidocOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformAsciidocOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Astro transform
// =============================================================================

describe('transformAstroOutput', () => {
  it('parses error output', () => {
    const output: string = 'src/pages/index.astro:3:1 - error: Cannot find module "./missing".';
    const results: LintResult[] = transformAstroOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('astro/check');
    expect(results[0]?.file).toBe('src/pages/index.astro');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('parses hint as info', () => {
    const output: string = 'src/layouts/Base.astro:7:10 - hint: Prefer const over let.';
    const results: LintResult[] = transformAstroOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('returns empty array for empty output', () => {
    expect(transformAstroOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// attw transform
// =============================================================================

describe('transformAttwOutput', () => {
  it('parses JSON output with problems', () => {
    const output: string = JSON.stringify({
      problems: [{ entrypoint: '.', kind: 'FalseESM', title: 'Types say ESM but CJS' }],
    });
    const results: LintResult[] = transformAttwOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('attw/FalseESM');
    expect(results[0]?.file).toBe('package.json');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformAttwOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Batch transform
// =============================================================================

describe('transformBatchOutput', () => {
  it('parses text output', () => {
    const output: string = 'deploy.bat:15: unexpected token after GOTO';
    const results: LintResult[] = transformBatchOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('batch/syntax');
    expect(results[0]?.file).toBe('deploy.bat');
    expect(results[0]?.line).toBe(15);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformBatchOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Bazel transform
// =============================================================================

describe('transformBazelOutput', () => {
  it('parses warning output', () => {
    const output: string = 'rules.bzl:15: warning: function-docstring: missing';
    const results: LintResult[] = transformBazelOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('bazel/lint');
    expect(results[0]?.file).toBe('rules.bzl');
    expect(results[0]?.line).toBe(15);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformBazelOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// cargo-clippy transform
// =============================================================================

describe('transformCargoClippyOutput', () => {
  it('parses warning output', () => {
    const output: string = 'src/main.rs:10:5: warning: unused variable `x`';
    const results: LintResult[] = transformCargoClippyOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('cargo-clippy/lint');
    expect(results[0]?.file).toBe('src/main.rs');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses error output', () => {
    const output: string = 'src/lib.rs:3:1: error: cannot find value';
    const results: LintResult[] = transformCargoClippyOutput(output);
    expect(results[0]?.severity).toBe('error');
  });

  it('parses note as info', () => {
    const output: string = 'src/lib.rs:3:1: note: some note';
    const results: LintResult[] = transformCargoClippyOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('returns empty array for empty output', () => {
    expect(transformCargoClippyOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// cargo-toml transform
// =============================================================================

describe('transformCargoTomlOutput', () => {
  it('parses taplo-format output', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> Cargo.toml:3:1';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('cargo-toml/lint');
    expect(results[0]?.file).toBe('Cargo.toml');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformCargoTomlOutput('')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only output', () => {
    expect(transformCargoTomlOutput('   \n  ')).toHaveLength(0);
  });

  it('parses warning severity', () => {
    const output: string = 'warning[unused_key]: unused key  --> Cargo.toml:10:1';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('[unused_key]');
  });

  it('parses output without location (no --> portion)', () => {
    const output: string = 'error[syntax_error]: unexpected token';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('Cargo.toml');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('skips blank lines in output', () => {
    const output: string =
      'error[e1]: msg1  --> Cargo.toml:1:1\n\nerror[e2]: msg2  --> Cargo.toml:2:1';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match taplo format', () => {
    const output: string = 'some random text\nerror[e1]: msg  --> Cargo.toml:1:1';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results).toHaveLength(1);
  });

  it('formats rule name in message', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> Cargo.toml:3:1';
    const results: LintResult[] = transformCargoTomlOutput(output);
    expect(results[0]?.message).toBe('[expected_equals] expected `=`');
  });
});

// =============================================================================
// checkCargoTomlSections — branch coverage
// =============================================================================

describe('checkCargoTomlSections', () => {
  it('returns error when neither [package] nor [workspace] present', () => {
    const results: LintResult[] = checkCargoTomlSections(
      'Cargo.toml',
      '[dependencies]\nfoo = "1.0"',
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('[package]');
    expect(results[0]?.message).toContain('[workspace]');
  });

  it('passes when [package] section is present', () => {
    const results: LintResult[] = checkCargoTomlSections(
      'Cargo.toml',
      '[package]\nname = "my-crate"\nversion = "0.1.0"',
    );
    expect(results).toHaveLength(0);
  });

  it('passes when [workspace] section is present', () => {
    const results: LintResult[] = checkCargoTomlSections(
      'Cargo.toml',
      '[workspace]\nmembers = ["crates/*"]',
    );
    expect(results).toHaveLength(0);
  });

  it('passes when both [package] and [workspace] are present', () => {
    const results: LintResult[] = checkCargoTomlSections(
      'Cargo.toml',
      '[package]\nname = "x"\n[workspace]\nmembers = []',
    );
    expect(results).toHaveLength(0);
  });

  it('uses the provided filename in the result', () => {
    const results: LintResult[] = checkCargoTomlSections('sub/Cargo.toml', '[dependencies]');
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('sub/Cargo.toml');
  });
});

// =============================================================================
// Checkstyle transform
// =============================================================================

describe('transformCheckstyleOutput', () => {
  it('parses text output', () => {
    const output: string = '[ERROR] /src/Main.java:10:5: Missing Javadoc comment.';
    const results: LintResult[] = transformCheckstyleOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('checkstyle/lint');
    expect(results[0]?.file).toBe('/src/Main.java');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('parses WARN level', () => {
    const output: string = '[WARN] /src/Main.java:20:1: Line too long.';
    const results: LintResult[] = transformCheckstyleOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformCheckstyleOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// clang-tidy transform
// =============================================================================

describe('transformClangTidyOutput', () => {
  it('parses warning with check name', () => {
    const output: string =
      "src/main.c:10:5: warning: unused variable 'x' [clang-diagnostic-unused-variable]";
    const results: LintResult[] = transformClangTidyOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('clang-tidy/clang-diagnostic-unused-variable');
    expect(results[0]?.file).toBe('src/main.c');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses error level', () => {
    const output: string =
      'src/foo.cpp:3:1: error: use of undeclared identifier [clang-diagnostic-error]';
    const results: LintResult[] = transformClangTidyOutput(output);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformClangTidyOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// cmake-lint transform
// =============================================================================

describe('transformCmakeLintOutput', () => {
  it('parses format with code', () => {
    const output: string = 'CMakeLists.txt:12,5: [C0103] Invalid function name "myFunc"';
    const results: LintResult[] = transformCmakeLintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('cmake/lint');
    expect(results[0]?.file).toBe('CMakeLists.txt');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.column).toBe(5);
  });

  it('parses simple format', () => {
    const output: string = 'CMakeLists.txt:12: Some lint message';
    const results: LintResult[] = transformCmakeLintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('cmake/lint');
  });

  it('returns empty array for empty output', () => {
    expect(transformCmakeLintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// codeowners-checker transform
// =============================================================================

describe('transformCodeownersCheckerOutput', () => {
  it('parses output with line number', () => {
    const output: string = 'CODEOWNERS:5: path does not exist: /src/old-module/';
    const results: LintResult[] = transformCodeownersCheckerOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('codeowners-checker/validate');
    expect(results[0]?.file).toBe('CODEOWNERS');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformCodeownersCheckerOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// codeowners transform
// =============================================================================

describe('transformCodeownersOutput', () => {
  it('parses output', () => {
    const output: string = 'CODEOWNERS:5: Invalid owner format: badowner';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('codeowners/syntax');
    expect(results[0]?.file).toBe('CODEOWNERS');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformCodeownersOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// conf transform
// =============================================================================

describe('transformConfOutput', () => {
  it('parses text output', () => {
    const output: string = 'app.conf:12: Invalid key-value pair';
    const results: LintResult[] = transformConfOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('conf/syntax');
    expect(results[0]?.file).toBe('app.conf');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformConfOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// crystal transform
// =============================================================================

describe('transformCrystalOutput', () => {
  it('parses formatting output', () => {
    const output: string = "formatting 'src/main.cr'";
    const results: LintResult[] = transformCrystalOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('crystal/format');
    expect(results[0]?.file).toBe('src/main.cr');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformCrystalOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// CSV transform
// =============================================================================

describe('transformCsvOutput', () => {
  it('parses text output', () => {
    const output: string = 'data.csv:5: expected 3 columns but found 4';
    const results: LintResult[] = transformCsvOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('csv/column-count');
    expect(results[0]?.file).toBe('data.csv');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformCsvOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// CUE transform
// =============================================================================

describe('transformCueOutput', () => {
  it('parses error output', () => {
    const output: string = 'schema.cue:12:5: conflicting values string and int';
    const results: LintResult[] = transformCueOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('cue/vet');
    expect(results[0]?.file).toBe('schema.cue');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformCueOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Dependabot transform
// =============================================================================

describe('transformDependabotOutput', () => {
  it('parses output', () => {
    const output: string = '.github/dependabot.yml:1: Missing required field: version';
    const results: LintResult[] = transformDependabotOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dependabot/config');
    expect(results[0]?.file).toBe('.github/dependabot.yml');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformDependabotOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// dependency-cruiser transform
// =============================================================================

describe('transformDependencyCruiserOutput', () => {
  it('parses JSON output with violations', () => {
    const output: string = JSON.stringify({
      output: {
        violations: [
          {
            from: 'src/a.ts',
            rule: { name: 'no-circular', severity: 'error' },
            to: 'src/b.ts',
          },
        ],
      },
    });
    const results: LintResult[] = transformDependencyCruiserOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dependency-cruiser/no-circular');
    expect(results[0]?.file).toBe('src/a.ts');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformDependencyCruiserOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Dhall transform
// =============================================================================

describe('transformDhallOutput', () => {
  it('parses structured output', () => {
    const output: string = 'config.dhall:5:10: needs formatting';
    const results: LintResult[] = transformDhallOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dhall/lint');
    expect(results[0]?.file).toBe('config.dhall');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('handles unstructured output as fallback', () => {
    const output: string = 'some unstructured error';
    const results: LintResult[] = transformDhallOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dhall/lint');
  });

  it('returns empty array for empty output', () => {
    expect(transformDhallOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// DMD transform
// =============================================================================

describe('transformDmdOutput', () => {
  it('parses Error output', () => {
    const output: string = "src/main.d(10): Error: undefined identifier 'foo'";
    const results: LintResult[] = transformDmdOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dmd/compile');
    expect(results[0]?.file).toBe('src/main.d');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('parses Warning output', () => {
    const output: string = 'src/utils.d(25): Warning: statement is not reachable';
    const results: LintResult[] = transformDmdOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses Deprecation as info', () => {
    const output: string = "src/lib.d(3): Deprecation: usage of 'bar' is deprecated";
    const results: LintResult[] = transformDmdOutput(output);
    expect(results[0]?.severity).toBe('info');
  });

  it('returns empty array for empty output', () => {
    expect(transformDmdOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Docker Compose transform
// =============================================================================

describe('transformDockerComposeOutput', () => {
  it('parses validation error', () => {
    const output: string = 'services.web.ports contains an invalid type';
    const results: LintResult[] = transformDockerComposeOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('docker-compose/validate');
    expect(results[0]?.file).toBe('docker-compose.yml');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformDockerComposeOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// dotnet format transform
// =============================================================================

describe('transformDotnetFormatOutput', () => {
  it('parses formatting output', () => {
    const output: string = "  Formatted code file 'src/Program.cs'.";
    const results: LintResult[] = transformDotnetFormatOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('dotnet-format/style');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty for Formatted 0 output', () => {
    const output: string = 'Formatted 0 of 5 files.';
    expect(transformDotnetFormatOutput(output, en)).toHaveLength(0);
  });

  it('returns empty array for empty output', () => {
    expect(transformDotnetFormatOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// editorconfig transform
// =============================================================================

describe('transformEditorconfigOutput', () => {
  it('parses output with line and column', () => {
    const output: string = 'src/main.ts:10:5: Wrong indent style';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('editorconfig/check');
    expect(results[0]?.file).toBe('src/main.ts');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformEditorconfigOutput('')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only output', () => {
    expect(transformEditorconfigOutput('   \n  ')).toHaveLength(0);
  });

  it('parses simple format without column (filename: message)', () => {
    const output: string = 'src/main.ts: Final newline expected';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('editorconfig/check');
    expect(results[0]?.file).toBe('src/main.ts');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.message).toBe('Final newline expected');
    expect(results[0]?.severity).toBe('warning');
  });

  it('skips blank lines in output', () => {
    const output: string = 'src/a.ts:1:1: err1\n\nsrc/b.ts:2:3: err2\n';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.file).toBe('src/a.ts');
    expect(results[1]?.file).toBe('src/b.ts');
  });

  it('parses multiple mixed-format lines', () => {
    const output: string = 'src/a.ts:5:10: Wrong indent\nsrc/b.ts: Missing newline';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(10);
    expect(results[1]?.line).toBe(1);
    expect(results[1]?.column).toBe(1);
  });

  it('extracts message from line-with-column format', () => {
    const output: string = 'file.ts:1:1: Wrong indent style';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results[0]?.message).toBe('Wrong indent style');
  });

  it('handles lines that match neither pattern', () => {
    const output: string = 'src/a.ts:5:10: err\nsome random text\nsrc/b.ts: err2';
    const results: LintResult[] = transformEditorconfigOutput(output);
    expect(results).toHaveLength(2);
  });
});

// =============================================================================
// Credo (Elixir) transform
// =============================================================================

describe('transformCredoOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      issues: [
        {
          category: 'readability',
          check: 'Credo.Check.Readability.ModuleDoc',
          column: 1,
          filename: 'lib/app.ex',
          line_no: 1,
          message: 'Modules should have a @moduledoc tag.',
          priority: 1,
        },
      ],
    });
    const results: LintResult[] = transformCredoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('credo/Credo.Check.Readability.ModuleDoc');
    expect(results[0]?.file).toBe('lib/app.ex');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformCredoOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// erlc transform
// =============================================================================

describe('transformErlcOutput', () => {
  it('parses warning output', () => {
    const output: string = 'src/app.erl:10: Warning: unused variable X';
    const results: LintResult[] = transformErlcOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('erlc/compile');
    expect(results[0]?.file).toBe('src/app.erl');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses error output', () => {
    const output: string = 'src/app.erl:5: error: syntax error before:';
    const results: LintResult[] = transformErlcOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformErlcOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Fantomas transform
// =============================================================================

describe('transformFantomasOutput', () => {
  it('parses not formatted output', () => {
    const output: string = 'src/Module.fs was not formatted';
    const results: LintResult[] = transformFantomasOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('fantomas/format');
    expect(results[0]?.file).toBe('src/Module.fs');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformFantomasOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Fish transform
// =============================================================================

describe('transformFishOutput', () => {
  it('parses fish syntax error', () => {
    const output: string = 'script.fish (line 10): Unexpected end of string';
    const results: LintResult[] = transformFishOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('fish/syntax');
    expect(results[0]?.file).toBe('script.fish');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformFishOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// gitattributes transform
// =============================================================================

describe('transformGitattributesOutput', () => {
  it('parses output', () => {
    const output: string = '.gitattributes:5: Invalid pattern';
    const results: LintResult[] = transformGitattributesOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('gitattributes/syntax');
    expect(results[0]?.file).toBe('.gitattributes');
    expect(results[0]?.line).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformGitattributesOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// GitHub FUNDING transform
// =============================================================================

describe('transformGithubFundingOutput', () => {
  it('parses output', () => {
    const output: string = 'FUNDING.yml:3: Invalid platform key';
    const results: LintResult[] = transformGithubFundingOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('github/funding');
    expect(results[0]?.file).toBe('FUNDING.yml');
    expect(results[0]?.line).toBe(3);
  });

  it('returns empty array for empty output', () => {
    expect(transformGithubFundingOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// GitHub Issue Template transform
// =============================================================================

describe('transformGithubIssueTemplateOutput', () => {
  it('parses output', () => {
    const output: string = 'ISSUE_TEMPLATE.md:1: Missing required field: name';
    const results: LintResult[] = transformGithubIssueTemplateOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('github/issue-template');
    expect(results[0]?.file).toBe('ISSUE_TEMPLATE.md');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformGithubIssueTemplateOutput('', en)).toHaveLength(0);
  });

  it('returns empty array for whitespace-only output', () => {
    expect(transformGithubIssueTemplateOutput('   \n  ', en)).toHaveLength(0);
  });

  it('skips blank lines in output', () => {
    const output: string = 'bug.yml:1: err1\n\nbug.yml:3: err2\n';
    const results: LintResult[] = transformGithubIssueTemplateOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match the pattern', () => {
    const output: string = 'some random text';
    const results: LintResult[] = transformGithubIssueTemplateOutput(output, en);
    expect(results).toHaveLength(0);
  });

  it('parses multiple diagnostics', () => {
    const output: string = 'bug.yml:1: Missing name\nbug.yml:2: Missing description';
    const results: LintResult[] = transformGithubIssueTemplateOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.message).toBe('Missing name');
    expect(results[1]?.message).toBe('Missing description');
  });
});

// =============================================================================
// validateIssueTemplate — branch coverage
// =============================================================================

describe('validateIssueTemplate', () => {
  it('returns error for empty content', () => {
    const results: LintResult[] = validateIssueTemplate('.github/ISSUE_TEMPLATE/bug.yml', '', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns error for whitespace-only content', () => {
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      '   \n  ',
      en,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns no issues when all required fields are present', () => {
    const content: string = 'name: Bug Report\ndescription: Report a bug\nlabels: [bug]';
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      content,
      en,
    );
    expect(results).toHaveLength(0);
  });

  it('reports missing name field', () => {
    const content: string = 'description: Report a bug\nlabels: [bug]';
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      content,
      en,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('name');
  });

  it('reports missing description field', () => {
    const content: string = 'name: Bug Report\nlabels: [bug]';
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      content,
      en,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('description');
  });

  it('reports missing labels field', () => {
    const content: string = 'name: Bug Report\ndescription: Report a bug';
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      content,
      en,
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('labels');
  });

  it('reports all missing fields when content has no top-level keys', () => {
    const content: string = '  indented: value\n  another: thing';
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/bug.yml',
      content,
      en,
    );
    expect(results).toHaveLength(3);
  });

  it('uses the provided filePath in results', () => {
    const results: LintResult[] = validateIssueTemplate(
      '.github/ISSUE_TEMPLATE/feature.yml',
      'title: test',
      en,
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.file).toBe('.github/ISSUE_TEMPLATE/feature.yml');
  });
});

// =============================================================================
// GitHub PR Template transform
// =============================================================================

describe('transformGithubPrTemplateOutput', () => {
  it('parses output', () => {
    const output: string = 'PULL_REQUEST_TEMPLATE.md:1: Template is too short';
    const results: LintResult[] = transformGithubPrTemplateOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('github/pr-template');
    expect(results[0]?.file).toBe('PULL_REQUEST_TEMPLATE.md');
  });

  it('returns empty array for empty output', () => {
    expect(transformGithubPrTemplateOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Gitleaks transform
// =============================================================================

describe('transformGitleaksOutput', () => {
  it('parses JSON array output', () => {
    const output: string = JSON.stringify([
      {
        Description: 'AWS Access Key',
        EndColumn: 30,
        EndLine: 5,
        File: 'config.ts',
        Match: 'AKIA...',
        RuleID: 'aws-access-key-id',
        Secret: 'AKIA...',
        StartColumn: 10,
        StartLine: 5,
      },
    ]);
    const results: LintResult[] = transformGitleaksOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('gitleaks/aws-access-key-id');
    expect(results[0]?.file).toBe('config.ts');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformGitleaksOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// go-mod transform
// =============================================================================

describe('transformGoModOutput', () => {
  it('parses error output', () => {
    const output: string = 'go.sum is out of sync';
    const results: LintResult[] = transformGoModOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('go-mod/verify');
    expect(results[0]?.file).toBe('go.mod');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformGoModOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// golangci-lint transform
// =============================================================================

describe('transformGolangciLintOutput', () => {
  it('parses output with linter name', () => {
    const output: string = 'main.go:10:5: unused variable (typecheck)';
    const results: LintResult[] = transformGolangciLintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('golangci-lint/typecheck');
    expect(results[0]?.file).toBe('main.go');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformGolangciLintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// GraphQL transform
// =============================================================================

describe('transformGraphqlOutput', () => {
  it('parses output', () => {
    const output: string = 'schema.graphql:10:5 Unknown type "Foo"';
    const results: LintResult[] = transformGraphqlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('graphql/lint');
    expect(results[0]?.file).toBe('schema.graphql');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformGraphqlOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Groovy Lint transform
// =============================================================================

describe('transformGroovyLintOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      files: {
        'build.gradle': {
          errors: [
            { column: 1, line: 5, msg: 'Unused import', rule: 'UnusedImport', severity: 'warning' },
          ],
        },
      },
    });
    const results: LintResult[] = transformGroovyLintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('groovy-lint/UnusedImport');
    expect(results[0]?.file).toBe('build.gradle');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformGroovyLintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Handlebars transform
// =============================================================================

describe('transformHandlebarsOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      'app.hbs': [
        { column: 3, line: 5, message: 'No bare strings', rule: 'no-bare-strings', severity: 2 },
      ],
    });
    const results: LintResult[] = transformHandlebarsOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('handlebars/no-bare-strings');
    expect(results[0]?.file).toBe('app.hbs');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformHandlebarsOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// HCL transform
// =============================================================================

describe('transformHclOutput', () => {
  it('parses file list output', () => {
    const output: string = 'config.hcl';
    const results: LintResult[] = transformHclOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hcl/format');
    expect(results[0]?.file).toBe('config.hcl');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformHclOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Helm Lint transform
// =============================================================================

describe('transformHelmLintOutput', () => {
  it('parses error output', () => {
    const output: string = '[ERROR] templates/deployment.yaml: invalid spec';
    const results: LintResult[] = transformHelmLintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('helm/lint');
    expect(results[0]?.severity).toBe('error');
  });

  it('parses warning output', () => {
    const output: string = '[WARNING] Chart.yaml: icon is recommended';
    const results: LintResult[] = transformHelmLintOutput(output);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformHelmLintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Helm Values transform
// =============================================================================

describe('transformHelmValuesOutput', () => {
  it('parses error output', () => {
    const output: string =
      'Error: YAML parse error on values.yaml: mapping values are not allowed in this context';
    const results: LintResult[] = transformHelmValuesOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('helm-values/validate');
    expect(results[0]?.file).toBe('values.yaml');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformHelmValuesOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// HLint transform
// =============================================================================

describe('transformHlintOutput', () => {
  it('parses JSON array output', () => {
    const output: string = JSON.stringify([
      {
        endColumn: 20,
        endLine: 5,
        file: 'Main.hs',
        from: 'fmap f xs',
        hint: 'Use map',
        severity: 'Warning',
        startColumn: 1,
        startLine: 5,
        to: 'map f xs',
      },
    ]);
    const results: LintResult[] = transformHlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('hlint/hint');
    expect(results[0]?.file).toBe('Main.hs');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformHlintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Ignore Files transform
// =============================================================================

describe('transformIgnoreFilesOutput', () => {
  it('parses output', () => {
    const output: string = '.gitignore:5: Invalid glob pattern "***"';
    const results: LintResult[] = transformIgnoreFilesOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ignore-file/lint');
    expect(results[0]?.file).toBe('.gitignore');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformIgnoreFilesOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// INI transform
// =============================================================================

describe('transformIniOutput', () => {
  it('parses text output', () => {
    const output: string = 'config.ini:12: Invalid key-value pair';
    const results: LintResult[] = transformIniOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ini/syntax');
    expect(results[0]?.file).toBe('config.ini');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformIniOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// jscpd transform
// =============================================================================

describe('transformJscpdOutput', () => {
  it('parses JSON output with duplicates', () => {
    const output: string = JSON.stringify({
      duplicates: [
        {
          firstFile: { end: { column: 1, line: 10 }, name: 'a.ts', start: { column: 1, line: 1 } },
          lines: 10,
          secondFile: {
            end: { column: 1, line: 14 },
            name: 'b.ts',
            start: { column: 1, line: 5 },
          },
          tokens: 50,
        },
      ],
    });
    const results: LintResult[] = transformJscpdOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jscpd/duplicate');
  });

  it('returns empty array for empty output', () => {
    expect(transformJscpdOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Jsonnet transform
// =============================================================================

describe('transformJsonnetOutput', () => {
  it('parses structured output', () => {
    const output: string = 'config.jsonnet:5:3: Expected token OPERATOR';
    const results: LintResult[] = transformJsonnetOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('jsonnet/format');
    expect(results[0]?.file).toBe('config.jsonnet');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.column).toBe(3);
  });

  it('returns empty array for empty output', () => {
    expect(transformJsonnetOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Julia transform
// =============================================================================

describe('transformJuliaOutput', () => {
  it('parses false output as format issue', () => {
    const output: string = 'false';
    const results: LintResult[] = transformJuliaOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('julia/format');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformJuliaOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Justfile transform
// =============================================================================

describe('transformJustOutput', () => {
  it('parses error at line output', () => {
    const output: string = 'error: Expected expression at line 5';
    const results: LintResult[] = transformJustOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('justfile/format');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformJustOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// ktlint transform
// =============================================================================

describe('transformKtlintOutput', () => {
  it('parses output with rule name', () => {
    const output: string = 'src/Main.kt:10:5: Unexpected blank line (no-blank-line-before-rbrace)';
    const results: LintResult[] = transformKtlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ktlint/no-blank-line-before-rbrace');
    expect(results[0]?.file).toBe('src/Main.kt');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformKtlintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// KubeLinter transform
// =============================================================================

describe('transformKubeLinterOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      Reports: [
        {
          Check: 'no-read-only-root-fs',
          Diagnostic: { Message: 'no read-only root fs' },
          Object: {
            K8sObject: {
              FilePath: 'deploy.yaml',
              GroupVersionKind: { Kind: 'Deployment' },
            },
          },
        },
      ],
    });
    const results: LintResult[] = transformKubeLinterOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('kube-linter/no-read-only-root-fs');
    expect(results[0]?.file).toBe('deploy.yaml');
  });

  it('returns empty array for empty output', () => {
    expect(transformKubeLinterOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Kubeconform transform
// =============================================================================

describe('transformKubeconformOutput', () => {
  it('parses JSONL output', () => {
    const output: string =
      '{"filename":"deploy.yaml","kind":"Deployment","status":"statusInvalid","msg":"missing field"}';
    const results: LintResult[] = transformKubeconformOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('kubeconform/statusInvalid');
    expect(results[0]?.file).toBe('deploy.yaml');
    expect(results[0]?.severity).toBe('error');
  });

  it('skips valid status entries', () => {
    const output: string =
      '{"filename":"deploy.yaml","kind":"Deployment","status":"statusValid","msg":""}';
    const results: LintResult[] = transformKubeconformOutput(output);
    expect(results).toHaveLength(0);
  });

  it('returns empty array for empty output', () => {
    expect(transformKubeconformOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// LaTeX (ChkTeX) transform
// =============================================================================

describe('transformChktexOutput', () => {
  it('parses colon-delimited format', () => {
    const output: string = 'main.tex:10:5:Warning:1:Command terminated with space';
    const results: LintResult[] = transformChktexOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('latex/check');
    expect(results[0]?.file).toBe('main.tex');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('parses verbose Warning format', () => {
    const output: string = 'Warning 1 in main.tex line 10: Command terminated with space';
    const results: LintResult[] = transformChktexOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('latex/check');
    expect(results[0]?.file).toBe('main.tex');
    expect(results[0]?.line).toBe(10);
  });

  it('returns empty array for empty output', () => {
    expect(transformChktexOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// License Checker transform
// =============================================================================

describe('transformLicenseCheckerOutput', () => {
  it('parses JSON output with problematic license', () => {
    const output: string = JSON.stringify({
      'some-pkg@1.0.0': {
        licenses: 'GPL-3.0',
        repository: 'https://github.com/example/pkg',
      },
    });
    const results: LintResult[] = transformLicenseCheckerOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('license-checker/problematic-license');
  });

  it('returns empty array for empty output', () => {
    expect(transformLicenseCheckerOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// lockfile-lint transform
// =============================================================================

describe('transformLockfileLintOutput', () => {
  it('parses ERR! output', () => {
    const output: string = 'ERR! registry uses http:// instead of https://';
    const results: LintResult[] = transformLockfileLintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('lockfile-lint/security');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformLockfileLintOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// ls-lint transform
// =============================================================================

describe('transformLsLintOutput', () => {
  it('parses violation output', () => {
    const output: string = 'src/MyComponent.tsx does not match the pattern';
    const results: LintResult[] = transformLsLintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ls-lint/naming');
    expect(results[0]?.file).toBe('src/MyComponent.tsx');
  });

  it('returns empty array for empty output', () => {
    expect(transformLsLintOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Luacheck transform
// =============================================================================

describe('transformLuacheckOutput', () => {
  it('parses output with code', () => {
    const output: string = 'src/init.lua:10:5: (W611) unused variable x';
    const results: LintResult[] = transformLuacheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('luacheck/W611');
    expect(results[0]?.file).toBe('src/init.lua');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformLuacheckOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Madge transform
// =============================================================================

describe('transformMadgeOutput', () => {
  it('parses JSON array of circular deps', () => {
    const output: string = JSON.stringify([['src/a.ts', 'src/b.ts', 'src/a.ts']]);
    const results: LintResult[] = transformMadgeOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('madge/circular-dependency');
    expect(results[0]?.file).toBe('src/a.ts');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformMadgeOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Makefile (checkmake) transform
// =============================================================================

describe('transformCheckmakeOutput', () => {
  it('parses output', () => {
    const output: string = '3:minphony:Missing .PHONY declaration';
    const results: LintResult[] = transformCheckmakeOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('makefile/minphony');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformCheckmakeOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Move transform
// =============================================================================

describe('transformMoveOutput', () => {
  it('parses error output', () => {
    const output: string = 'error[E0001]: some error --> src/main.move:10:5';
    const results: LintResult[] = transformMoveOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('move/build');
    expect(results[0]?.file).toBe('src/main.move');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformMoveOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// mypy transform
// =============================================================================

describe('transformMypyOutput', () => {
  it('parses error output', () => {
    const output: string = 'src/main.py:10:5: error: Incompatible types';
    const results: LintResult[] = transformMypyOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('mypy/type-check');
    expect(results[0]?.file).toBe('src/main.py');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformMypyOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Nim transform
// =============================================================================

describe('transformNimOutput', () => {
  it('parses Error output', () => {
    const output: string = 'src/main.nim(10, 5) Error: undeclared identifier';
    const results: LintResult[] = transformNimOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('nim/check');
    expect(results[0]?.file).toBe('src/main.nim');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNimOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Ninja transform
// =============================================================================

describe('transformNinjaOutput', () => {
  it('parses error output', () => {
    const output: string = 'build.ninja:10: error: bad rule name';
    const results: LintResult[] = transformNinjaOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ninja/check');
    expect(results[0]?.file).toBe('build.ninja');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNinjaOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Nix transform
// =============================================================================

describe('transformNixOutput', () => {
  it('parses error output', () => {
    const output: string = 'error: undefined variable, at default.nix:10:5';
    const results: LintResult[] = transformNixOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('nix/syntax');
    expect(results[0]?.file).toBe('default.nix');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNixOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Nomad transform
// =============================================================================

describe('transformNomadOutput', () => {
  it('parses error output', () => {
    const output: string = 'Job validation failed';
    const results: LintResult[] = transformNomadOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('nomad/validate');
    expect(results[0]?.file).toBe('job.nomad');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNomadOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// npmrc transform
// =============================================================================

describe('transformNpmrcOutput', () => {
  it('parses output', () => {
    const output: string = '.npmrc:3: Invalid registry URL';
    const results: LintResult[] = transformNpmrcOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('npmrc/syntax');
    expect(results[0]?.file).toBe('.npmrc');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNpmrcOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// nvmrc transform
// =============================================================================

describe('transformNvmrcOutput', () => {
  it('parses output', () => {
    const output: string = '.nvmrc:1: Invalid version format';
    const results: LintResult[] = transformNvmrcOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('nvmrc/version');
    expect(results[0]?.file).toBe('.nvmrc');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformNvmrcOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// OCaml transform
// =============================================================================

describe('transformOcamlOutput', () => {
  it('parses Error output', () => {
    const output: string = 'File "src/main.ml", line 10, characters 5-12: Error: Unbound value foo';
    const results: LintResult[] = transformOcamlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ocaml/compile');
    expect(results[0]?.file).toBe('src/main.ml');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformOcamlOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// oxlint transform
// =============================================================================

describe('transformOxlintOutput', () => {
  it('parses JSON output with diagnostics', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          causes: [],
          code: 'eslint(no-unused-vars)',
          filename: 'src/main.ts',
          help: 'Consider removing this variable.',
          labels: [
            { label: "'x' is declared here", span: { column: 5, length: 1, line: 3, offset: 20 } },
          ],
          message: "Variable 'x' is assigned a value but never used.",
          related: [],
          severity: 'error',
          url: 'https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unused-vars.html',
        },
      ],
      number_of_files: 1,
    });

    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('oxlint/no-unused-vars');
    expect(results[0]?.file).toBe('src/main.ts');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("Variable 'x'");
    expect(results[0]?.tip).toBe('Consider removing this variable.');
    expect(results[0]?.url).toContain('oxc.rs');
  });

  it('returns empty array for empty output', () => {
    expect(transformOxlintOutput('')).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', () => {
    expect(transformOxlintOutput('not json')).toHaveLength(0);
  });

  it('returns empty array for zero diagnostics', () => {
    const output: string = JSON.stringify({ diagnostics: [], number_of_files: 0 });
    expect(transformOxlintOutput(output)).toHaveLength(0);
  });

  it('handles multiple diagnostics', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          code: 'eslint(no-unused-vars)',
          filename: 'a.ts',
          labels: [{ span: { column: 1, line: 1 } }],
          message: 'msg1',
          severity: 'error',
        },
        {
          code: 'eslint(curly)',
          filename: 'b.ts',
          labels: [{ span: { column: 2, line: 5 } }],
          message: 'msg2',
          severity: 'warning',
        },
      ],
    });

    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('oxlint/no-unused-vars');
    expect(results[1]?.ruleId).toBe('oxlint/curly');
    expect(results[1]?.severity).toBe('warning');
  });

  it('normalizes typescript-eslint rule codes', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          code: 'typescript-eslint(no-explicit-any)',
          filename: 'file.ts',
          labels: [{ span: { column: 1, line: 1 } }],
          message: 'no any',
          severity: 'error',
        },
      ],
    });

    const results: LintResult[] = transformOxlintOutput(output);
    expect(results[0]?.ruleId).toBe('oxlint/no-explicit-any');
  });

  it('handles missing labels gracefully', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          code: 'eslint(no-debugger)',
          filename: 'file.ts',
          labels: [],
          message: 'no debugger',
          severity: 'warning',
        },
      ],
    });

    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
  });

  it('handles whitespace-only output', () => {
    expect(transformOxlintOutput('   \n  ')).toHaveLength(0);
  });

  it('maps info severity correctly', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'info message',
          code: 'eslint(info-rule)',
          severity: 'info',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('info');
  });

  it('maps help severity to info', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'help message',
          code: 'eslint(help-rule)',
          severity: 'help',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('info');
  });

  it('maps error severity correctly', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'error message',
          code: 'eslint(err-rule)',
          severity: 'error',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('normalizes rule code without parentheses', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'msg',
          code: 'some-rule',
          severity: 'warning',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results[0]?.ruleId).toBe('oxlint/some-rule');
  });

  it('normalizes empty rule code to oxlint/unknown', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'msg',
          code: '',
          severity: 'warning',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results[0]?.ruleId).toBe('oxlint/unknown');
  });

  it('includes help as tip when present', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'msg',
          code: 'eslint(rule)',
          severity: 'warning',
          url: 'https://example.com',
          help: 'Try fixing this',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results[0]?.tip).toBe('Try fixing this');
    expect(results[0]?.url).toBe('https://example.com');
  });

  it('omits tip and url when empty', () => {
    const output: string = JSON.stringify({
      diagnostics: [
        {
          message: 'msg',
          code: 'eslint(rule)',
          severity: 'warning',
          url: '',
          help: '',
          filename: 'src/a.ts',
          labels: [],
        },
      ],
    });
    const results: LintResult[] = transformOxlintOutput(output);
    expect(results[0]?.tip).toBeUndefined();
    expect(results[0]?.url).toBeUndefined();
  });
});

// =============================================================================
// package-json-validator transform
// =============================================================================

describe('transformPackageJsonValidatorOutput', () => {
  it('parses output', () => {
    const output: string = 'package.json:1: Missing required field "name"';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('package-json/validate');
    expect(results[0]?.file).toBe('package.json');
    expect(results[0]?.line).toBe(1);
  });

  it('returns empty array for empty output', () => {
    expect(transformPackageJsonValidatorOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Packer transform
// =============================================================================

describe('transformPackerOutput', () => {
  it('parses error output', () => {
    const output: string = 'Error parsing template';
    const results: LintResult[] = transformPackerOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('packer/validate');
    expect(results[0]?.file).toBe('template.pkr.hcl');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPackerOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Perl transform
// =============================================================================

describe('transformPerlOutput', () => {
  it('parses syntax error', () => {
    const output: string = 'syntax error at script.pl line 10';
    const results: LintResult[] = transformPerlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('perl/syntax');
    expect(results[0]?.file).toBe('script.pl');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPerlOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// PHP transform
// =============================================================================

describe('transformPhpOutput', () => {
  it('parses parse error', () => {
    const output: string = "Parse error: syntax error, unexpected '}' in script.php on line 10";
    const results: LintResult[] = transformPhpOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('php/syntax');
    expect(results[0]?.file).toBe('script.php');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPhpOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// PowerShell transform
// =============================================================================

describe('transformPowershellOutput', () => {
  it('parses JSON array output', () => {
    const output: string = JSON.stringify([
      {
        Column: 1,
        Line: 3,
        Message: 'Avoid using alias ls',
        RuleName: 'PSAvoidUsingCmdletAliases',
        ScriptPath: 'script.ps1',
        Severity: 'Warning',
      },
    ]);
    const results: LintResult[] = transformPowershellOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('powershell/PSAvoidUsingCmdletAliases');
    expect(results[0]?.file).toBe('script.ps1');
    expect(results[0]?.line).toBe(3);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformPowershellOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Properties transform
// =============================================================================

describe('transformPropertiesOutput', () => {
  it('parses text output', () => {
    const output: string = 'config.properties:12: Invalid key-value pair';
    const results: LintResult[] = transformPropertiesOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('properties/syntax');
    expect(results[0]?.file).toBe('config.properties');
    expect(results[0]?.line).toBe(12);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPropertiesOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Protobuf transform
// =============================================================================

describe('transformProtobufOutput', () => {
  it('parses buf output', () => {
    const output: string = 'api.proto:10:5:Field names should be lower_snake_case';
    const results: LintResult[] = transformProtobufOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('protobuf/lint');
    expect(results[0]?.file).toBe('api.proto');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformProtobufOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Publint transform
// =============================================================================

describe('transformPublintOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      messages: [{ args: {}, code: 'MISSING_EXPORTS', path: './dist/index.js', type: 'error' }],
    });
    const results: LintResult[] = transformPublintOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('publint/MISSING_EXPORTS');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPublintOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// pyproject-toml transform
// =============================================================================

describe('transformPyprojectTomlOutput', () => {
  it('parses taplo-format output', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> pyproject.toml:3:1';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('pyproject-toml/lint');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformPyprojectTomlOutput('')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only output', () => {
    expect(transformPyprojectTomlOutput('   \n  ')).toHaveLength(0);
  });

  it('parses warning severity', () => {
    const output: string = 'warning[unused_key]: unused key  --> pyproject.toml:10:1';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('[unused_key]');
  });

  it('parses output without location (no --> portion)', () => {
    const output: string = 'error[syntax_error]: unexpected token';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('pyproject.toml');
    expect(results[0]?.line).toBe(1);
    expect(results[0]?.column).toBe(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('skips blank lines in output', () => {
    const output: string =
      'error[e1]: msg1  --> pyproject.toml:1:1\n\nerror[e2]: msg2  --> pyproject.toml:2:1';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match taplo format', () => {
    const output: string = 'some random text\nerror[e1]: msg  --> pyproject.toml:1:1';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results).toHaveLength(1);
  });

  it('formats rule name in message', () => {
    const output: string = 'error[expected_equals]: expected `=`  --> pyproject.toml:3:1';
    const results: LintResult[] = transformPyprojectTomlOutput(output);
    expect(results[0]?.message).toBe('[expected_equals] expected `=`');
  });
});

// =============================================================================
// checkPyprojectTomlSections — branch coverage
// =============================================================================

describe('checkPyprojectTomlSections', () => {
  it('returns warning when neither [project] nor [tool.poetry] present', () => {
    const results: LintResult[] = checkPyprojectTomlSections(
      'pyproject.toml',
      '[tool.black]\nline-length = 88',
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('[project]');
    expect(results[0]?.message).toContain('[tool.poetry]');
  });

  it('passes when [project] section is present', () => {
    const results: LintResult[] = checkPyprojectTomlSections(
      'pyproject.toml',
      '[project]\nname = "my-pkg"\nversion = "1.0.0"',
    );
    expect(results).toHaveLength(0);
  });

  it('passes when [tool.poetry] section is present', () => {
    const results: LintResult[] = checkPyprojectTomlSections(
      'pyproject.toml',
      '[tool.poetry]\nname = "my-pkg"\nversion = "1.0.0"',
    );
    expect(results).toHaveLength(0);
  });

  it('passes when both [project] and [tool.poetry] are present', () => {
    const results: LintResult[] = checkPyprojectTomlSections(
      'pyproject.toml',
      '[project]\nname = "x"\n[tool.poetry]\nname = "x"',
    );
    expect(results).toHaveLength(0);
  });

  it('uses the provided filename in the result', () => {
    const results: LintResult[] = checkPyprojectTomlSections('sub/pyproject.toml', '[tool.black]');
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('sub/pyproject.toml');
  });
});

// =============================================================================
// Reason transform
// =============================================================================

describe('transformReasonOutput', () => {
  it('parses error output', () => {
    const output: string = 'File "src/App.re", line 5, characters 0-10:\nError: Syntax error';
    const results: LintResult[] = transformReasonOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('reason/format');
    expect(results[0]?.file).toBe('src/App.re');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty for non-error output', () => {
    expect(transformReasonOutput('formatted successfully')).toHaveLength(0);
  });

  it('returns empty array for empty output', () => {
    expect(transformReasonOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// RScript transform
// =============================================================================

describe('transformRscriptOutput', () => {
  it('parses lintr output', () => {
    const output: string = 'script.R:10:5: style: trailing whitespace';
    const results: LintResult[] = transformRscriptOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('rscript/lint');
    expect(results[0]?.file).toBe('script.R');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('returns empty array for empty output', () => {
    expect(transformRscriptOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// rstcheck transform
// =============================================================================

describe('transformRstcheckOutput', () => {
  it('parses error output', () => {
    const output: string = 'README.rst:10: (ERROR/3) Unknown directive type "code"';
    const results: LintResult[] = transformRstcheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('rstcheck/error');
    expect(results[0]?.file).toBe('README.rst');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformRstcheckOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// RuboCop transform
// =============================================================================

describe('transformRubocopOutput', () => {
  it('parses JSON output', () => {
    const output: string = JSON.stringify({
      files: [
        {
          offenses: [
            {
              cop_name: 'Layout/LineLength',
              location: { start_column: 1, start_line: 5 },
              message: 'Line is too long.',
              severity: 'convention',
            },
          ],
          path: 'app.rb',
        },
      ],
    });
    const results: LintResult[] = transformRubocopOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('rubocop/Layout/LineLength');
    expect(results[0]?.file).toBe('app.rb');
    expect(results[0]?.line).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformRubocopOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Scalafmt transform
// =============================================================================

describe('transformScalafmtOutput', () => {
  it('parses error output', () => {
    const output: string = 'error: src/Main.scala:10:5: missing newline';
    const results: LintResult[] = transformScalafmtOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('scalafmt/format');
    expect(results[0]?.file).toBe('src/Main.scala');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformScalafmtOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Sentinel transform
// =============================================================================

describe('transformSentinelOutput', () => {
  it('parses file list output', () => {
    const output: string = 'policy.sentinel';
    const results: LintResult[] = transformSentinelOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sentinel/format');
    expect(results[0]?.file).toBe('policy.sentinel');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSentinelOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Solidity (Solhint) transform
// =============================================================================

describe('transformSolhintOutput', () => {
  it('parses inline format', () => {
    const output: string =
      'contracts/Token.sol:10:5: warning Provide an error message for revert [reason-string]';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('solidity/reason-string');
    expect(results[0]?.file).toBe('contracts/Token.sol');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSolhintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// sort-package-json transform
// =============================================================================

describe('transformSortPackageJsonOutput', () => {
  it('parses not sorted output', () => {
    const output: string = 'package.json is not sorted';
    const results: LintResult[] = transformSortPackageJsonOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('sort-package-json/order');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSortPackageJsonOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// SVGLint transform
// =============================================================================

describe('transformSvglintOutput', () => {
  it('parses output', () => {
    const output: string = 'icon.svg: Missing viewBox attribute';
    const results: LintResult[] = transformSvglintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('svglint/lint');
    expect(results[0]?.file).toBe('icon.svg');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSvglintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// SwiftLint transform
// =============================================================================

describe('transformSwiftlintOutput', () => {
  it('parses JSON array output', () => {
    const output: string = JSON.stringify([
      {
        character: 5,
        file: '/src/App.swift',
        line: 10,
        reason: 'Line should be 120 characters or less',
        rule_id: 'line_length',
        severity: 'Warning',
        type: 'Line Length',
      },
    ]);
    const results: LintResult[] = transformSwiftlintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('swiftlint/line_length');
    expect(results[0]?.file).toBe('/src/App.swift');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSwiftlintOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Syncpack transform
// =============================================================================

describe('transformSyncpackOutput', () => {
  it('parses mismatch output', () => {
    const output: string = '\u2718 lodash has mismatched versions';
    const results: LintResult[] = transformSyncpackOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('syncpack/version-mismatch');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformSyncpackOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Terraform transform
// =============================================================================

describe('transformTerraformOutput', () => {
  it('parses diff output', () => {
    const output: string = '--- a/main.tf\n+++ b/main.tf\n@@ -1,2 +1,2 @@';
    const results: LintResult[] = transformTerraformOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('terraform/format');
    expect(results[0]?.file).toBe('main.tf');
    expect(results[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformTerraformOutput('', en)).toHaveLength(0);
  });
});

// =============================================================================
// Thrift transform
// =============================================================================

describe('transformThriftOutput', () => {
  it('parses error output', () => {
    const output: string = "[ERROR:service.thrift:10] (last token was '}') unexpected token";
    const results: LintResult[] = transformThriftOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('thrift/syntax');
    expect(results[0]?.file).toBe('service.thrift');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformThriftOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// TruffleHog transform
// =============================================================================

describe('transformTrufflehogOutput', () => {
  it('parses JSONL output', () => {
    const output: string = JSON.stringify({
      DetectorName: 'AWS',
      SourceMetadata: {
        Data: { Filesystem: { file: 'config.ts', line: 12 } },
      },
      Verified: true,
    });
    const results: LintResult[] = transformTrufflehogOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('trufflehog/AWS');
    expect(results[0]?.file).toBe('config.ts');
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformTrufflehogOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// VB.NET transform
// =============================================================================

describe('transformVbOutput', () => {
  it('always returns empty array (placeholder)', () => {
    expect(transformVbOutput('anything')).toHaveLength(0);
  });

  it('returns empty array for empty output', () => {
    expect(transformVbOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// V (Vlang) transform
// =============================================================================

describe('transformVlangOutput', () => {
  it('parses error output', () => {
    const output: string = 'main.v:10:5: error: undefined identifier';
    const results: LintResult[] = transformVlangOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vlang/check');
    expect(results[0]?.file).toBe('main.v');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformVlangOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Vyper transform
// =============================================================================

describe('transformVyperOutput', () => {
  it('parses exception output', () => {
    const output: string =
      'vyper.exceptions.StructureException: Invalid type (contracts/Token.vy, line 10';
    const results: LintResult[] = transformVyperOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vyper/compile');
    expect(results[0]?.file).toBe('contracts/Token.vy');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformVyperOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// WAT transform
// =============================================================================

describe('transformWatOutput', () => {
  it('parses error output', () => {
    const output: string = 'module.wat:10:5: error: unexpected token';
    const results: LintResult[] = transformWatOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('wat/syntax');
    expect(results[0]?.file).toBe('module.wat');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformWatOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// XML transform
// =============================================================================

describe('transformXmlOutput', () => {
  it('parses xmllint output', () => {
    const output: string = 'config.xml:10: parser error : expected >';
    const results: LintResult[] = transformXmlOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('xml/syntax');
    expect(results[0]?.file).toBe('config.xml');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformXmlOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Zig transform
// =============================================================================

describe('transformZigOutput', () => {
  it('parses error output', () => {
    const output: string = 'src/main.zig:10:5: error: expected expression';
    const results: LintResult[] = transformZigOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('zig/syntax');
    expect(results[0]?.file).toBe('src/main.zig');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformZigOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// Zsh transform
// =============================================================================

describe('transformZshOutput', () => {
  it('parses syntax error', () => {
    const output: string = 'script.zsh:10: parse error near `}`';
    const results: LintResult[] = transformZshOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('zsh/syntax');
    expect(results[0]?.file).toBe('script.zsh');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns empty array for empty output', () => {
    expect(transformZshOutput('')).toHaveLength(0);
  });
});

// =============================================================================
// New 92 tool definition property tests
// =============================================================================

describe('92 new tool definitions', () => {
  it('asciidocTool has correct properties', () => {
    expect(asciidocTool.name).toBe('asciidoctor');
    expect(asciidocTool.command).toBe('asciidoctor');
    expect(asciidocTool.outputFormat).toBe('text');
    expect(asciidocTool.transform).toBe(transformAsciidocOutput);
  });

  it('astroTool has correct properties', () => {
    expect(astroTool.name).toBe('astro');
    expect(astroTool.command).toBe('astro');
    expect(astroTool.outputFormat).toBe('text');
    expect(astroTool.transform).toBe(transformAstroOutput);
  });

  it('attwTool has correct properties', () => {
    expect(attwTool.name).toBe('attw');
    expect(attwTool.command).toBe('attw');
    expect(attwTool.outputFormat).toBe('json');
    expect(attwTool.transform).toBe(transformAttwOutput);
  });

  it('batchTool has correct properties', () => {
    expect(batchTool.name).toBe('batch');
    expect(batchTool.outputFormat).toBe('text');
    expect(batchTool.transform).toBe(transformBatchOutput);
  });

  it('bazelTool has correct properties', () => {
    expect(bazelTool.name).toBe('buildifier');
    expect(bazelTool.command).toBe('buildifier');
    expect(bazelTool.outputFormat).toBe('text');
    expect(bazelTool.transform).toBe(transformBazelOutput);
  });

  it('cargoClippyTool has correct properties', () => {
    expect(cargoClippyTool.name).toBe('cargo-clippy');
    expect(cargoClippyTool.command).toBe('cargo');
    expect(cargoClippyTool.outputFormat).toBe('text');
    expect(cargoClippyTool.transform).toBe(transformCargoClippyOutput);
  });

  it('cargoTomlTool has correct properties', () => {
    expect(cargoTomlTool.name).toBe('cargo-toml');
    expect(cargoTomlTool.command).toBe('taplo');
    expect(cargoTomlTool.outputFormat).toBe('text');
    expect(cargoTomlTool.transform).toBe(transformCargoTomlOutput);
  });

  it('checkstyleTool has correct properties', () => {
    expect(checkstyleTool.name).toBe('checkstyle');
    expect(checkstyleTool.command).toBe('checkstyle');
    expect(checkstyleTool.outputFormat).toBe('text');
    expect(checkstyleTool.transform).toBe(transformCheckstyleOutput);
  });

  it('clangTidyTool has correct properties', () => {
    expect(clangTidyTool.name).toBe('clang-tidy');
    expect(clangTidyTool.command).toBe('clang-tidy');
    expect(clangTidyTool.outputFormat).toBe('text');
    expect(clangTidyTool.transform).toBe(transformClangTidyOutput);
  });

  it('cmakeLintTool has correct properties', () => {
    expect(cmakeLintTool.name).toBe('cmake-lint');
    expect(cmakeLintTool.command).toBe('cmake-lint');
    expect(cmakeLintTool.outputFormat).toBe('text');
    expect(cmakeLintTool.transform).toBe(transformCmakeLintOutput);
  });

  it('codeownersCheckerTool has correct properties', () => {
    expect(codeownersCheckerTool.name).toBe('codeowners-checker');
    expect(codeownersCheckerTool.outputFormat).toBe('text');
    expect(codeownersCheckerTool.transform).toBe(transformCodeownersCheckerOutput);
  });

  it('codeownersTool has correct properties', () => {
    expect(codeownersTool.name).toBe('codeowners');
    expect(codeownersTool.outputFormat).toBe('text');
    expect(codeownersTool.transform).toBe(transformCodeownersOutput);
  });

  it('confTool has correct properties', () => {
    expect(confTool.name).toBe('conf');
    expect(confTool.outputFormat).toBe('text');
    expect(confTool.transform).toBe(transformConfOutput);
  });

  it('crystalTool has correct properties', () => {
    expect(crystalTool.name).toBe('crystal');
    expect(crystalTool.command).toBe('crystal');
    expect(crystalTool.outputFormat).toBe('text');
    expect(crystalTool.transform).toBe(transformCrystalOutput);
  });

  it('csvTool has correct properties', () => {
    expect(csvTool.name).toBe('csv');
    expect(csvTool.outputFormat).toBe('text');
    expect(csvTool.transform).toBe(transformCsvOutput);
  });

  it('cueTool has correct properties', () => {
    expect(cueTool.name).toBe('cue');
    expect(cueTool.command).toBe('cue');
    expect(cueTool.outputFormat).toBe('text');
    expect(cueTool.transform).toBe(transformCueOutput);
  });

  it('dependabotTool has correct properties', () => {
    expect(dependabotTool.name).toBe('dependabot');
    expect(dependabotTool.outputFormat).toBe('text');
    expect(dependabotTool.transform).toBe(transformDependabotOutput);
  });

  it('dependencyCruiserTool has correct properties', () => {
    expect(dependencyCruiserTool.name).toBe('dependency-cruiser');
    expect(dependencyCruiserTool.command).toBe('depcruise');
    expect(dependencyCruiserTool.outputFormat).toBe('json');
    expect(dependencyCruiserTool.transform).toBe(transformDependencyCruiserOutput);
  });

  it('dhallTool has correct properties', () => {
    expect(dhallTool.name).toBe('dhall');
    expect(dhallTool.command).toBe('dhall');
    expect(dhallTool.outputFormat).toBe('text');
    expect(dhallTool.transform).toBe(transformDhallOutput);
  });

  it('dmdTool has correct properties', () => {
    expect(dmdTool.name).toBe('dmd');
    expect(dmdTool.command).toBe('dmd');
    expect(dmdTool.outputFormat).toBe('text');
    expect(dmdTool.transform).toBe(transformDmdOutput);
  });

  it('dockerComposeTool has correct properties', () => {
    expect(dockerComposeTool.name).toBe('docker-compose');
    expect(dockerComposeTool.command).toBe('docker');
    expect(dockerComposeTool.outputFormat).toBe('text');
    expect(dockerComposeTool.transform).toBe(transformDockerComposeOutput);
  });

  it('dotnetFormatTool has correct properties', () => {
    expect(dotnetFormatTool.name).toBe('dotnet-format');
    expect(dotnetFormatTool.command).toBe('dotnet');
    expect(dotnetFormatTool.outputFormat).toBe('text');
    expect(dotnetFormatTool.transform).toBe(transformDotnetFormatOutput);
  });

  it('editorconfigCheckerTool has correct properties', () => {
    expect(editorconfigCheckerTool.name).toBe('editorconfig-checker');
    expect(editorconfigCheckerTool.outputFormat).toBe('text');
    expect(editorconfigCheckerTool.transform).toBe(transformEditorconfigOutput);
  });

  it('credoTool has correct properties', () => {
    expect(credoTool.name).toBe('credo');
    expect(credoTool.command).toBe('mix');
    expect(credoTool.outputFormat).toBe('json');
    expect(credoTool.transform).toBe(transformCredoOutput);
  });

  it('erlcTool has correct properties', () => {
    expect(erlcTool.name).toBe('erlc');
    expect(erlcTool.command).toBe('erlc');
    expect(erlcTool.outputFormat).toBe('text');
    expect(erlcTool.transform).toBe(transformErlcOutput);
  });

  it('fantomasTool has correct properties', () => {
    expect(fantomasTool.name).toBe('fantomas');
    expect(fantomasTool.command).toBe('fantomas');
    expect(fantomasTool.outputFormat).toBe('text');
    expect(fantomasTool.transform).toBe(transformFantomasOutput);
  });

  it('fishTool has correct properties', () => {
    expect(fishTool.name).toBe('fish');
    expect(fishTool.command).toBe('fish');
    expect(fishTool.outputFormat).toBe('text');
    expect(fishTool.transform).toBe(transformFishOutput);
  });

  it('gitattributesTool has correct properties', () => {
    expect(gitattributesTool.name).toBe('gitattributes');
    expect(gitattributesTool.outputFormat).toBe('text');
    expect(gitattributesTool.transform).toBe(transformGitattributesOutput);
  });

  it('githubFundingTool has correct properties', () => {
    expect(githubFundingTool.name).toBe('github-funding');
    expect(githubFundingTool.outputFormat).toBe('text');
    expect(githubFundingTool.transform).toBe(transformGithubFundingOutput);
  });

  it('githubIssueTemplateTool has correct properties', () => {
    expect(githubIssueTemplateTool.name).toBe('github-issue-template');
    expect(githubIssueTemplateTool.outputFormat).toBe('text');
    expect(githubIssueTemplateTool.transform).toBe(transformGithubIssueTemplateOutput);
  });

  it('githubPrTemplateTool has correct properties', () => {
    expect(githubPrTemplateTool.name).toBe('github-pr-template');
    expect(githubPrTemplateTool.outputFormat).toBe('text');
    expect(githubPrTemplateTool.transform).toBe(transformGithubPrTemplateOutput);
  });

  it('gitleaksTool has correct properties', () => {
    expect(gitleaksTool.name).toBe('gitleaks');
    expect(gitleaksTool.command).toBe('gitleaks');
    expect(gitleaksTool.outputFormat).toBe('json');
    expect(gitleaksTool.transform).toBe(transformGitleaksOutput);
  });

  it('goModTool has correct properties', () => {
    expect(goModTool.name).toBe('go-mod');
    expect(goModTool.command).toBe('go');
    expect(goModTool.outputFormat).toBe('text');
    expect(goModTool.transform).toBe(transformGoModOutput);
  });

  it('golangciLintTool has correct properties', () => {
    expect(golangciLintTool.name).toBe('golangci-lint');
    expect(golangciLintTool.command).toBe('golangci-lint');
    expect(golangciLintTool.outputFormat).toBe('text');
    expect(golangciLintTool.transform).toBe(transformGolangciLintOutput);
  });

  it('graphqlTool has correct properties', () => {
    expect(graphqlTool.name).toBe('graphql-schema-linter');
    expect(graphqlTool.outputFormat).toBe('text');
    expect(graphqlTool.transform).toBe(transformGraphqlOutput);
  });

  it('groovyLintTool has correct properties', () => {
    expect(groovyLintTool.name).toBe('groovy-lint');
    expect(groovyLintTool.outputFormat).toBe('json');
    expect(groovyLintTool.transform).toBe(transformGroovyLintOutput);
  });

  it('handlebarsTool has correct properties', () => {
    expect(handlebarsTool.name).toBe('handlebars');
    expect(handlebarsTool.outputFormat).toBe('json');
    expect(handlebarsTool.transform).toBe(transformHandlebarsOutput);
  });

  it('hclTool has correct properties', () => {
    expect(hclTool.name).toBe('hcl');
    expect(hclTool.outputFormat).toBe('text');
    expect(hclTool.transform).toBe(transformHclOutput);
  });

  it('helmLintTool has correct properties', () => {
    expect(helmLintTool.name).toBe('helm-lint');
    expect(helmLintTool.command).toBe('helm');
    expect(helmLintTool.outputFormat).toBe('text');
    expect(helmLintTool.transform).toBe(transformHelmLintOutput);
  });

  it('helmValuesTool has correct properties', () => {
    expect(helmValuesTool.name).toBe('helm-values');
    expect(helmValuesTool.outputFormat).toBe('text');
    expect(helmValuesTool.transform).toBe(transformHelmValuesOutput);
  });

  it('hlintTool has correct properties', () => {
    expect(hlintTool.name).toBe('hlint');
    expect(hlintTool.command).toBe('hlint');
    expect(hlintTool.outputFormat).toBe('json');
    expect(hlintTool.transform).toBe(transformHlintOutput);
  });

  it('ignoreFilesTool has correct properties', () => {
    expect(ignoreFilesTool.name).toBe('ignore-files');
    expect(ignoreFilesTool.outputFormat).toBe('text');
    expect(ignoreFilesTool.transform).toBe(transformIgnoreFilesOutput);
  });

  it('iniTool has correct properties', () => {
    expect(iniTool.name).toBe('ini');
    expect(iniTool.outputFormat).toBe('text');
    expect(iniTool.transform).toBe(transformIniOutput);
  });

  it('jscpdTool has correct properties', () => {
    expect(jscpdTool.name).toBe('jscpd');
    expect(jscpdTool.command).toBe('jscpd');
    expect(jscpdTool.outputFormat).toBe('json');
    expect(jscpdTool.transform).toBe(transformJscpdOutput);
  });

  it('jsonnetTool has correct properties', () => {
    expect(jsonnetTool.name).toBe('jsonnetfmt');
    expect(jsonnetTool.outputFormat).toBe('text');
    expect(jsonnetTool.transform).toBe(transformJsonnetOutput);
  });

  it('juliaTool has correct properties', () => {
    expect(juliaTool.name).toBe('julia');
    expect(juliaTool.command).toBe('julia');
    expect(juliaTool.outputFormat).toBe('text');
    expect(juliaTool.transform).toBe(transformJuliaOutput);
  });

  it('justTool has correct properties', () => {
    expect(justTool.name).toBe('just');
    expect(justTool.command).toBe('just');
    expect(justTool.outputFormat).toBe('text');
    expect(justTool.transform).toBe(transformJustOutput);
  });

  it('ktlintTool has correct properties', () => {
    expect(ktlintTool.name).toBe('ktlint');
    expect(ktlintTool.command).toBe('ktlint');
    expect(ktlintTool.outputFormat).toBe('text');
    expect(ktlintTool.transform).toBe(transformKtlintOutput);
  });

  it('kubeLinterTool has correct properties', () => {
    expect(kubeLinterTool.name).toBe('kube-linter');
    expect(kubeLinterTool.command).toBe('kube-linter');
    expect(kubeLinterTool.outputFormat).toBe('json');
    expect(kubeLinterTool.transform).toBe(transformKubeLinterOutput);
  });

  it('kubeconformTool has correct properties', () => {
    expect(kubeconformTool.name).toBe('kubeconform');
    expect(kubeconformTool.command).toBe('kubeconform');
    expect(kubeconformTool.outputFormat).toBe('json');
    expect(kubeconformTool.transform).toBe(transformKubeconformOutput);
  });

  it('chktexTool has correct properties', () => {
    expect(chktexTool.name).toBe('chktex');
    expect(chktexTool.command).toBe('chktex');
    expect(chktexTool.outputFormat).toBe('text');
    expect(chktexTool.transform).toBe(transformChktexOutput);
  });

  it('licenseCheckerTool has correct properties', () => {
    expect(licenseCheckerTool.name).toBe('license-checker');
    expect(licenseCheckerTool.command).toBe('license-checker');
    expect(licenseCheckerTool.outputFormat).toBe('json');
    expect(licenseCheckerTool.transform).toBe(transformLicenseCheckerOutput);
  });

  it('lockfileLintTool has correct properties', () => {
    expect(lockfileLintTool.name).toBe('lockfile-lint');
    expect(lockfileLintTool.command).toBe('lockfile-lint');
    expect(lockfileLintTool.outputFormat).toBe('text');
    expect(lockfileLintTool.transform).toBe(transformLockfileLintOutput);
  });

  it('lsLintTool has correct properties', () => {
    expect(lsLintTool.name).toBe('ls-lint');
    expect(lsLintTool.command).toBe('ls-lint');
    expect(lsLintTool.outputFormat).toBe('text');
    expect(lsLintTool.transform).toBe(transformLsLintOutput);
  });

  it('luacheckTool has correct properties', () => {
    expect(luacheckTool.name).toBe('luacheck');
    expect(luacheckTool.command).toBe('luacheck');
    expect(luacheckTool.outputFormat).toBe('text');
    expect(luacheckTool.transform).toBe(transformLuacheckOutput);
  });

  it('madgeTool has correct properties', () => {
    expect(madgeTool.name).toBe('madge');
    expect(madgeTool.command).toBe('madge');
    expect(madgeTool.outputFormat).toBe('json');
    expect(madgeTool.transform).toBe(transformMadgeOutput);
  });

  it('checkmakeTool has correct properties', () => {
    expect(checkmakeTool.name).toBe('checkmake');
    expect(checkmakeTool.command).toBe('checkmake');
    expect(checkmakeTool.outputFormat).toBe('text');
    expect(checkmakeTool.transform).toBe(transformCheckmakeOutput);
  });

  it('moveTool has correct properties', () => {
    expect(moveTool.name).toBe('move');
    expect(moveTool.outputFormat).toBe('text');
    expect(moveTool.transform).toBe(transformMoveOutput);
  });

  it('mypyTool has correct properties', () => {
    expect(mypyTool.name).toBe('mypy');
    expect(mypyTool.command).toBe('mypy');
    expect(mypyTool.outputFormat).toBe('text');
    expect(mypyTool.transform).toBe(transformMypyOutput);
  });

  it('nimTool has correct properties', () => {
    expect(nimTool.name).toBe('nim');
    expect(nimTool.command).toBe('nim');
    expect(nimTool.outputFormat).toBe('text');
    expect(nimTool.transform).toBe(transformNimOutput);
  });

  it('ninjaTool has correct properties', () => {
    expect(ninjaTool.name).toBe('ninja');
    expect(ninjaTool.command).toBe('ninja');
    expect(ninjaTool.outputFormat).toBe('text');
    expect(ninjaTool.transform).toBe(transformNinjaOutput);
  });

  it('nixTool has correct properties', () => {
    expect(nixTool.name).toBe('nix-instantiate');
    expect(nixTool.command).toBe('nix-instantiate');
    expect(nixTool.outputFormat).toBe('text');
    expect(nixTool.transform).toBe(transformNixOutput);
  });

  it('nomadTool has correct properties', () => {
    expect(nomadTool.name).toBe('nomad');
    expect(nomadTool.command).toBe('nomad');
    expect(nomadTool.outputFormat).toBe('text');
    expect(nomadTool.transform).toBe(transformNomadOutput);
  });

  it('npmrcTool has correct properties', () => {
    expect(npmrcTool.name).toBe('npmrc');
    expect(npmrcTool.outputFormat).toBe('text');
    expect(npmrcTool.transform).toBe(transformNpmrcOutput);
  });

  it('nvmrcTool has correct properties', () => {
    expect(nvmrcTool.name).toBe('nvmrc');
    expect(nvmrcTool.outputFormat).toBe('text');
    expect(nvmrcTool.transform).toBe(transformNvmrcOutput);
  });

  it('ocamlTool has correct properties', () => {
    expect(ocamlTool.name).toBe('ocaml');
    expect(ocamlTool.command).toBe('ocamlc');
    expect(ocamlTool.outputFormat).toBe('text');
    expect(ocamlTool.transform).toBe(transformOcamlOutput);
  });

  it('oxlintTool has correct properties', () => {
    expect(oxlintTool.name).toBe('oxlint');
    expect(oxlintTool.command).toBe('oxlint');
    expect(oxlintTool.args).toContain('--format=json');
    expect(oxlintTool.outputFormat).toBe('json');
    expect(oxlintTool.filePatterns).toContain('**/*.ts');
    expect(oxlintTool.filePatterns).toContain('**/*.js');
    expect(oxlintTool.filePatterns).toContain('**/*.tsx');
    expect(oxlintTool.transform).toBe(transformOxlintOutput);
  });

  it('packageJsonValidatorTool has correct properties', () => {
    expect(packageJsonValidatorTool.name).toBe('package-json-validator');
    expect(packageJsonValidatorTool.outputFormat).toBe('text');
    expect(packageJsonValidatorTool.transform).toBe(transformPackageJsonValidatorOutput);
  });

  it('packerTool has correct properties', () => {
    expect(packerTool.name).toBe('packer');
    expect(packerTool.command).toBe('packer');
    expect(packerTool.outputFormat).toBe('text');
    expect(packerTool.transform).toBe(transformPackerOutput);
  });

  it('perlTool has correct properties', () => {
    expect(perlTool.name).toBe('perl');
    expect(perlTool.command).toBe('perl');
    expect(perlTool.outputFormat).toBe('text');
    expect(perlTool.transform).toBe(transformPerlOutput);
  });

  it('phpTool has correct properties', () => {
    expect(phpTool.name).toBe('php');
    expect(phpTool.command).toBe('php');
    expect(phpTool.outputFormat).toBe('text');
    expect(phpTool.transform).toBe(transformPhpOutput);
  });

  it('powershellTool has correct properties', () => {
    expect(powershellTool.name).toBe('powershell');
    expect(powershellTool.command).toBe('pwsh');
    expect(powershellTool.outputFormat).toBe('json');
    expect(powershellTool.transform).toBe(transformPowershellOutput);
  });

  it('propertiesTool has correct properties', () => {
    expect(propertiesTool.name).toBe('properties');
    expect(propertiesTool.outputFormat).toBe('text');
    expect(propertiesTool.transform).toBe(transformPropertiesOutput);
  });

  it('protobufTool has correct properties', () => {
    expect(protobufTool.name).toBe('protobuf');
    expect(protobufTool.command).toBe('buf');
    expect(protobufTool.outputFormat).toBe('text');
    expect(protobufTool.transform).toBe(transformProtobufOutput);
  });

  it('publintTool has correct properties', () => {
    expect(publintTool.name).toBe('publint');
    expect(publintTool.command).toBe('publint');
    expect(publintTool.outputFormat).toBe('json');
    expect(publintTool.transform).toBe(transformPublintOutput);
  });

  it('pyprojectTomlTool has correct properties', () => {
    expect(pyprojectTomlTool.name).toBe('pyproject-toml');
    expect(pyprojectTomlTool.command).toBe('taplo');
    expect(pyprojectTomlTool.outputFormat).toBe('text');
    expect(pyprojectTomlTool.transform).toBe(transformPyprojectTomlOutput);
  });

  it('reasonTool has correct properties', () => {
    expect(reasonTool.name).toBe('reason');
    expect(reasonTool.command).toBe('refmt');
    expect(reasonTool.outputFormat).toBe('text');
    expect(reasonTool.transform).toBe(transformReasonOutput);
  });

  it('rscriptTool has correct properties', () => {
    expect(rscriptTool.name).toBe('rscript');
    expect(rscriptTool.command).toBe('Rscript');
    expect(rscriptTool.outputFormat).toBe('text');
    expect(rscriptTool.transform).toBe(transformRscriptOutput);
  });

  it('rstcheckTool has correct properties', () => {
    expect(rstcheckTool.name).toBe('rstcheck');
    expect(rstcheckTool.command).toBe('rstcheck');
    expect(rstcheckTool.outputFormat).toBe('text');
    expect(rstcheckTool.transform).toBe(transformRstcheckOutput);
  });

  it('rubocopTool has correct properties', () => {
    expect(rubocopTool.name).toBe('rubocop');
    expect(rubocopTool.command).toBe('rubocop');
    expect(rubocopTool.outputFormat).toBe('json');
    expect(rubocopTool.transform).toBe(transformRubocopOutput);
  });

  it('scalafmtTool has correct properties', () => {
    expect(scalafmtTool.name).toBe('scalafmt');
    expect(scalafmtTool.command).toBe('scalafmt');
    expect(scalafmtTool.outputFormat).toBe('text');
    expect(scalafmtTool.transform).toBe(transformScalafmtOutput);
  });

  it('sentinelTool has correct properties', () => {
    expect(sentinelTool.name).toBe('sentinel');
    expect(sentinelTool.command).toBe('sentinel');
    expect(sentinelTool.outputFormat).toBe('text');
    expect(sentinelTool.transform).toBe(transformSentinelOutput);
  });

  it('solhintTool has correct properties', () => {
    expect(solhintTool.name).toBe('solhint');
    expect(solhintTool.command).toBe('solhint');
    expect(solhintTool.outputFormat).toBe('text');
    expect(solhintTool.transform).toBe(transformSolhintOutput);
  });

  it('sortPackageJsonTool has correct properties', () => {
    expect(sortPackageJsonTool.name).toBe('sort-package-json');
    expect(sortPackageJsonTool.outputFormat).toBe('text');
    expect(sortPackageJsonTool.transform).toBe(transformSortPackageJsonOutput);
  });

  it('svglintTool has correct properties', () => {
    expect(svglintTool.name).toBe('svglint');
    expect(svglintTool.command).toBe('svglint');
    expect(svglintTool.outputFormat).toBe('text');
    expect(svglintTool.transform).toBe(transformSvglintOutput);
  });

  it('swiftlintTool has correct properties', () => {
    expect(swiftlintTool.name).toBe('swiftlint');
    expect(swiftlintTool.command).toBe('swiftlint');
    expect(swiftlintTool.outputFormat).toBe('json');
    expect(swiftlintTool.transform).toBe(transformSwiftlintOutput);
  });

  it('syncpackTool has correct properties', () => {
    expect(syncpackTool.name).toBe('syncpack');
    expect(syncpackTool.command).toBe('syncpack');
    expect(syncpackTool.outputFormat).toBe('text');
    expect(syncpackTool.transform).toBe(transformSyncpackOutput);
  });

  it('terraformTool has correct properties', () => {
    expect(terraformTool.name).toBe('terraform');
    expect(terraformTool.command).toBe('terraform');
    expect(terraformTool.outputFormat).toBe('text');
    expect(terraformTool.transform).toBe(transformTerraformOutput);
  });

  it('thriftTool has correct properties', () => {
    expect(thriftTool.name).toBe('thrift');
    expect(thriftTool.command).toBe('thrift');
    expect(thriftTool.outputFormat).toBe('text');
    expect(thriftTool.transform).toBe(transformThriftOutput);
  });

  it('trufflehogTool has correct properties', () => {
    expect(trufflehogTool.name).toBe('trufflehog');
    expect(trufflehogTool.command).toBe('trufflehog');
    expect(trufflehogTool.outputFormat).toBe('json');
    expect(trufflehogTool.transform).toBe(transformTrufflehogOutput);
  });

  it('vbTool has correct properties', () => {
    expect(vbTool.name).toBe('vb');
    expect(vbTool.outputFormat).toBe('text');
    expect(vbTool.transform).toBe(transformVbOutput);
  });

  it('vlangTool has correct properties', () => {
    expect(vlangTool.name).toBe('vlang');
    expect(vlangTool.outputFormat).toBe('text');
    expect(vlangTool.transform).toBe(transformVlangOutput);
  });

  it('vyperTool has correct properties', () => {
    expect(vyperTool.name).toBe('vyper');
    expect(vyperTool.command).toBe('vyper');
    expect(vyperTool.outputFormat).toBe('text');
    expect(vyperTool.transform).toBe(transformVyperOutput);
  });

  it('watTool has correct properties', () => {
    expect(watTool.name).toBe('wat2wasm');
    expect(watTool.outputFormat).toBe('text');
    expect(watTool.transform).toBe(transformWatOutput);
  });

  it('xmlTool has correct properties', () => {
    expect(xmlTool.name).toBe('xmllint');
    expect(xmlTool.command).toBe('xmllint');
    expect(xmlTool.outputFormat).toBe('text');
    expect(xmlTool.transform).toBe(transformXmlOutput);
  });

  it('zigTool has correct properties', () => {
    expect(zigTool.name).toBe('zig');
    expect(zigTool.command).toBe('zig');
    expect(zigTool.outputFormat).toBe('text');
    expect(zigTool.transform).toBe(transformZigOutput);
  });

  it('zshTool has correct properties', () => {
    expect(zshTool.name).toBe('zsh');
    expect(zshTool.command).toBe('zsh');
    expect(zshTool.outputFormat).toBe('text');
    expect(zshTool.transform).toBe(transformZshOutput);
  });
});

// =============================================================================
// Dependabot transform — additional branch coverage
// =============================================================================

describe('transformDependabotOutput — branch coverage', () => {
  it('parses multiple diagnostic lines', () => {
    const output: string =
      '.github/dependabot.yml:1: Missing required field: version\n' +
      '.github/dependabot.yml:2: Missing required field: updates';
    const results: LintResult[] = transformDependabotOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.line).toBe(1);
    expect(results[1]?.line).toBe(2);
  });

  it('skips blank lines in output', () => {
    const output: string =
      '.github/dependabot.yml:1: error one\n\n.github/dependabot.yml:3: error two\n';
    const results: LintResult[] = transformDependabotOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match the pattern', () => {
    const output: string = 'some random text without colon-line format';
    const results: LintResult[] = transformDependabotOutput(output, en);
    expect(results).toHaveLength(0);
  });

  it('returns empty array for whitespace-only output', () => {
    expect(transformDependabotOutput('   \n  \n', en)).toHaveLength(0);
  });
});

// =============================================================================
// validateDependabot — branch coverage
// =============================================================================

describe('validateDependabot', () => {
  it('returns error for empty content', () => {
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', '', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toBeTruthy();
  });

  it('returns error for whitespace-only content', () => {
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', '   \n  ', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns error for missing version field', () => {
    const content: string = 'updates:\n  - package-ecosystem: npm\n    directory: /';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const versionError = results.find((r) => r.message.includes('version'));
    expect(versionError).toBeTruthy();
    expect(versionError?.severity).toBe('error');
  });

  it('returns error for invalid version (not 2)', () => {
    const content: string = 'version: 1\nupdates:\n  - package-ecosystem: npm\n    directory: /';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const versionError = results.find((r) => r.message.includes('1'));
    expect(versionError).toBeTruthy();
    expect(versionError?.severity).toBe('error');
  });

  it('returns error for missing updates field', () => {
    const content: string = 'version: 2';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const updatesError = results.find((r) => r.message.includes('updates'));
    expect(updatesError).toBeTruthy();
    expect(updatesError?.severity).toBe('error');
  });

  it('returns no errors for valid config', () => {
    const content: string =
      'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('warns about unrecognized ecosystem', () => {
    const content: string = 'version: 2\nupdates:\n    package-ecosystem: foobar\n    directory: /';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const ecosystemWarning = results.find((r) => r.severity === 'warning');
    expect(ecosystemWarning).toBeTruthy();
    expect(ecosystemWarning?.message).toContain('foobar');
  });

  it('accepts valid ecosystems without warning', () => {
    const content: string =
      'version: 2\nupdates:\n    package-ecosystem: npm\n    directory: /\n    package-ecosystem: docker\n    directory: /';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const warnings = results.filter((r) => r.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });

  it('skips indented lines when looking for version field', () => {
    const content: string =
      'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('skips tab-indented lines when looking for version field', () => {
    const content: string = 'version: 2\nupdates:\n\tpackage-ecosystem: npm';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('handles quoted ecosystem values', () => {
    const content: string = 'version: 2\nupdates:\n    package-ecosystem: "npm"\n    directory: /';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const warnings = results.filter((r) => r.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });

  it('handles single-quoted ecosystem values', () => {
    const content: string =
      "version: 2\nupdates:\n    package-ecosystem: 'cargo'\n    directory: /";
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    const warnings = results.filter((r) => r.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });

  it('returns both missing version and missing updates for bare content', () => {
    const content: string = 'some-key: some-value';
    const results: LintResult[] = validateDependabot('.github/dependabot.yml', content, en);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// Solhint transform — additional branch coverage
// =============================================================================

describe('transformSolhintOutput — branch coverage', () => {
  it('parses inline error severity', () => {
    const output: string =
      'contracts/Token.sol:10:5: error Missing pragma solidity [compiler-version]';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('solidity/compiler-version');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.file).toBe('contracts/Token.sol');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
  });

  it('parses stylish format with filename header and indented diagnostic', () => {
    const output: string =
      'contracts/Token.sol\n  10:5  warning  Provide an error message for revert  reason-string';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('solidity/reason-string');
    expect(results[0]?.file).toBe('contracts/Token.sol');
    expect(results[0]?.line).toBe(10);
    expect(results[0]?.column).toBe(5);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses stylish format with error severity', () => {
    const output: string = 'contracts/Token.sol\n  10:5  error  Missing pragma  compiler-version';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.ruleId).toBe('solidity/compiler-version');
  });

  it('parses multiple stylish diagnostics under one file header', () => {
    const output: string =
      'contracts/Token.sol\n' +
      '  10:5  warning  Provide an error message for revert  reason-string\n' +
      '  20:1  error    Missing pragma  compiler-version';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.line).toBe(10);
    expect(results[1]?.line).toBe(20);
  });

  it('skips summary lines starting with checkmark symbols', () => {
    const output: string =
      'contracts/Token.sol:10:5: warning msg [rule-id]\n' +
      '\n' +
      '\u2716 1 problem (0 errors, 1 warning)';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('skips summary lines starting with multiplication sign', () => {
    const output = 'contracts/Token.sol:10:5: warning msg [rule-id]\n\u00D7 1 problem';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
  });

  it('handles whitespace-only output', () => {
    expect(transformSolhintOutput('   \n  ')).toHaveLength(0);
  });

  it('parses multiple inline diagnostics', () => {
    const output = 'a.sol:1:1: warning msg1 [rule1]\nb.sol:2:3: error msg2 [rule2]';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.ruleId).toBe('solidity/rule1');
    expect(results[1]?.ruleId).toBe('solidity/rule2');
  });

  it('uses filename header for stylish format diagnostics across multiple files', () => {
    const output: string =
      'contracts/A.sol\n' +
      '  1:1  warning  msg1  rule1\n' +
      '\n' +
      'contracts/B.sol\n' +
      '  2:3  error  msg2  rule2';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0]?.file).toBe('contracts/A.sol');
    expect(results[1]?.file).toBe('contracts/B.sol');
  });

  it('skips blank lines between entries', () => {
    const output: string = 'a.sol:1:1: warning msg [rule]\n\n\n';
    const results: LintResult[] = transformSolhintOutput(output);
    expect(results).toHaveLength(1);
  });
});

// =============================================================================
// Codeowners transform — additional branch coverage
// =============================================================================

describe('transformCodeownersOutput — branch coverage', () => {
  it('assigns warning severity for overly broad messages', () => {
    const output: string = 'CODEOWNERS:1: overly broad wildcard pattern';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('assigns error severity for non-broad messages', () => {
    const output: string = 'CODEOWNERS:5: Invalid owner format: badowner';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('parses multiple lines', () => {
    const output: string = 'CODEOWNERS:1: overly broad pattern\nCODEOWNERS:5: Invalid owner';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.severity).toBe('warning');
    expect(results[1]?.severity).toBe('error');
  });

  it('skips blank lines in output', () => {
    const output: string = 'CODEOWNERS:1: error one\n\nCODEOWNERS:3: error two\n';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match the pattern', () => {
    const output: string = 'random unstructured text';
    const results: LintResult[] = transformCodeownersOutput(output, en);
    expect(results).toHaveLength(0);
  });

  it('returns empty for whitespace-only output', () => {
    expect(transformCodeownersOutput('   \n  ', en)).toHaveLength(0);
  });
});

// =============================================================================
// validateCodeowners — branch coverage
// =============================================================================

describe('validateCodeowners', () => {
  it('returns error for empty content', () => {
    const results: LintResult[] = validateCodeowners('CODEOWNERS', '', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns error for whitespace-only content', () => {
    const results: LintResult[] = validateCodeowners('CODEOWNERS', '   \n  ', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('skips comment lines', () => {
    const content: string = '# This is a comment\n*.ts @org/team';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });

  it('skips empty lines', () => {
    const content: string = '*.ts @org/team\n\n*.js @org/team';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });

  it('warns about overly broad wildcard pattern', () => {
    const content: string = '* @org/team';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    const broadWarning = results.find((r) => r.severity === 'warning');
    expect(broadWarning).toBeTruthy();
  });

  it('reports error for pattern with no owners', () => {
    const content: string = 'src/';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('reports error for invalid owner format', () => {
    const content: string = '*.ts badowner';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('badowner');
  });

  it('accepts valid @username owner', () => {
    const content: string = '*.ts @alice';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });

  it('accepts valid @org/team owner', () => {
    const content: string = '*.ts @myorg/frontend-team';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });

  it('accepts valid email owner', () => {
    const content: string = '*.ts user@example.com';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });

  it('reports multiple invalid owners on the same line', () => {
    const content: string = '*.ts badowner1 badowner2';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(2);
  });

  it('validates each line independently', () => {
    const content: string = '*.ts @org/team\nsrc/ badowner\n*.js';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    const errors = results.filter((r) => r.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('does not warn about non-wildcard patterns', () => {
    const content: string = 'src/ @org/team';
    const results: LintResult[] = validateCodeowners('CODEOWNERS', content, en);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// GitHub Funding transform — additional branch coverage
// =============================================================================

describe('transformGithubFundingOutput — branch coverage', () => {
  it('parses multiple diagnostic lines', () => {
    const output: string = 'FUNDING.yml:1: issue one\nFUNDING.yml:3: issue two';
    const results: LintResult[] = transformGithubFundingOutput(output, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.line).toBe(1);
    expect(results[1]?.line).toBe(3);
  });

  it('sets severity to warning', () => {
    const output: string = 'FUNDING.yml:3: Unrecognized platform';
    const results: LintResult[] = transformGithubFundingOutput(output, en);
    expect(results[0]?.severity).toBe('warning');
  });

  it('skips blank lines', () => {
    const output: string = 'FUNDING.yml:1: err\n\nFUNDING.yml:3: err2\n';
    const results: LintResult[] = transformGithubFundingOutput(output, en);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match the pattern', () => {
    const output: string = 'some random text';
    const results: LintResult[] = transformGithubFundingOutput(output, en);
    expect(results).toHaveLength(0);
  });

  it('returns empty for whitespace-only output', () => {
    expect(transformGithubFundingOutput('   \n  ', en)).toHaveLength(0);
  });
});

// =============================================================================
// validateFunding — branch coverage
// =============================================================================

describe('validateFunding', () => {
  it('returns error for empty content', () => {
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', '', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns error for whitespace-only content', () => {
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', '   \n  ', en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('returns no issues for valid platforms', () => {
    const content: string = 'github: username\npatreon: myaccount';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('warns about unrecognized platform key', () => {
    const content: string = 'buymeacoffee: myaccount';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('buymeacoffee');
  });

  it('skips comment lines', () => {
    const content: string = '# This is a comment\ngithub: username';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('skips indented lines', () => {
    const content: string = 'custom:\n  - https://example.com/donate';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('skips tab-indented lines', () => {
    const content: string = 'custom:\n\t- https://example.com/donate';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('reports multiple unrecognized platforms', () => {
    const content: string = 'buymeacoffee: a\nvenmo: b';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(2);
    expect(results[0]?.severity).toBe('warning');
    expect(results[1]?.severity).toBe('warning');
  });

  it('accepts all valid platform keys', () => {
    const content: string = [
      'github: u',
      'patreon: u',
      'open_collective: u',
      'ko_fi: u',
      'tidelift: u',
      'community_bridge: u',
      'liberapay: u',
      'issuehunt: u',
      'otechie: u',
      'lfx_crowdfunding: u',
      'custom: https://example.com',
    ].join('\n');
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });

  it('does not match lines without colon key format', () => {
    const content: string = 'github: u\nthis is not a key line';
    const results: LintResult[] = validateFunding('.github/FUNDING.yml', content, en);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// package-json-validator transform — additional branch coverage
// =============================================================================

describe('transformPackageJsonValidatorOutput — branch coverage', () => {
  it('assigns error severity for non-ESM messages', () => {
    const output: string = 'package.json:1: Missing required field "name"';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('error');
  });

  it('assigns warning severity for ESM messages', () => {
    const output: string = 'package.json:1: Consider using ESM modules';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('assigns warning severity for .mjs messages', () => {
    const output: string =
      'package.json:1: Package references .mjs files — consider using ESM-native "type": "module" instead';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('warning');
  });

  it('parses multiple diagnostic lines', () => {
    const output: string =
      'package.json:1: Missing required field "name"\npackage.json:1: Missing required field "version"';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips blank lines', () => {
    const output: string = 'package.json:1: error\n\npackage.json:2: error2\n';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(2);
  });

  it('skips lines that do not match the pattern', () => {
    const output: string = 'some random text without colon format';
    const results: LintResult[] = transformPackageJsonValidatorOutput(output);
    expect(results).toHaveLength(0);
  });

  it('returns empty for whitespace-only output', () => {
    expect(transformPackageJsonValidatorOutput('   \n  ')).toHaveLength(0);
  });
});

// =============================================================================
// validatePackageJson — branch coverage
// =============================================================================

describe('validatePackageJson', () => {
  it('returns error for invalid JSON', () => {
    const output: string = validatePackageJson('package.json', '{invalid json}');
    expect(output).toContain('Invalid JSON');
    expect(output).toContain('package.json');
  });

  it('returns error for missing name field', () => {
    const output: string = validatePackageJson('package.json', '{"version":"1.0.0"}');
    expect(output).toContain('Missing required field "name"');
  });

  it('returns error for missing version field', () => {
    const output: string = validatePackageJson('package.json', '{"name":"my-pkg"}');
    expect(output).toContain('Missing required field "version"');
  });

  it('returns errors for both missing name and version', () => {
    const output: string = validatePackageJson('package.json', '{}');
    expect(output).toContain('Missing required field "name"');
    expect(output).toContain('Missing required field "version"');
  });

  it('returns empty string for valid package.json', () => {
    const output: string = validatePackageJson(
      'package.json',
      '{"name":"my-pkg","version":"1.0.0"}',
    );
    expect(output).toBe('');
  });

  it('warns about .mjs references', () => {
    const output: string = validatePackageJson(
      'package.json',
      '{"name":"my-pkg","version":"1.0.0","main":"index.mjs"}',
    );
    expect(output).toContain('.mjs');
  });

  it('returns error when name is empty string', () => {
    const output: string = validatePackageJson('package.json', '{"name":"","version":"1.0.0"}');
    expect(output).toContain('Missing required field "name"');
  });

  it('returns error when version is empty string', () => {
    const output: string = validatePackageJson('package.json', '{"name":"my-pkg","version":""}');
    expect(output).toContain('Missing required field "version"');
  });

  it('returns error when name is not a string', () => {
    const output: string = validatePackageJson('package.json', '{"name":123,"version":"1.0.0"}');
    expect(output).toContain('Missing required field "name"');
  });

  it('returns error when version is not a string', () => {
    const output: string = validatePackageJson('package.json', '{"name":"my-pkg","version":1}');
    expect(output).toContain('Missing required field "version"');
  });

  it('does not warn about .mjs when not present', () => {
    const output: string = validatePackageJson(
      'package.json',
      '{"name":"my-pkg","version":"1.0.0","main":"index.js"}',
    );
    expect(output).toBe('');
  });
});

// =============================================================================
// tsgo transform
// =============================================================================

describe('transformTsgoOutput', () => {
  it('parses a single error diagnostic', () => {
    const output: string =
      'src/index.ts(10,5): error TS2322: Type "string" is not assignable to type "number".';
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('tsgo/TS2322');
    expect(results[0]!.file).toBe('src/index.ts');
    expect(results[0]!.line).toBe(10);
    expect(results[0]!.column).toBe(5);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toBe('Type "string" is not assignable to type "number".');
  });

  it('parses a warning diagnostic', () => {
    const output: string =
      'lib/utils.ts(3,1): warning TS6133: "x" is declared but its value is never read.';
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('tsgo/TS6133');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.file).toBe('lib/utils.ts');
    expect(results[0]!.line).toBe(3);
    expect(results[0]!.column).toBe(1);
    expect(results[0]!.message).toBe('"x" is declared but its value is never read.');
  });

  it('parses multiple diagnostics', () => {
    const output: string = [
      'src/a.ts(1,1): error TS2304: Cannot find name "foo".',
      'src/b.ts(20,10): error TS2345: Argument of type "string" is not assignable to parameter of type "number".',
      'src/c.ts(5,3): warning TS6196: "bar" is declared but never used.',
    ].join('\n');
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(3);
    expect(results[0]!.ruleId).toBe('tsgo/TS2304');
    expect(results[0]!.file).toBe('src/a.ts');
    expect(results[1]!.ruleId).toBe('tsgo/TS2345');
    expect(results[1]!.file).toBe('src/b.ts');
    expect(results[2]!.ruleId).toBe('tsgo/TS6196');
    expect(results[2]!.severity).toBe('warning');
  });

  it('returns empty array for empty output', () => {
    expect(transformTsgoOutput('')).toEqual([]);
    expect(transformTsgoOutput('   ')).toEqual([]);
    expect(transformTsgoOutput('\n\n')).toEqual([]);
  });

  it('skips continuation lines and non-diagnostic output', () => {
    const output: string = [
      'src/index.ts(10,5): error TS2322: Type mismatch.',
      '  The expected type comes from property "x".',
      '  which is declared on type "Foo".',
      '',
      'Found 1 error.',
    ].join('\n');
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('tsgo/TS2322');
  });

  it('handles file paths with spaces and special characters', () => {
    const output: string = 'src/my file (copy).ts(1,1): error TS1005: ";" expected.';
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.file).toBe('src/my file (copy).ts');
    expect(results[0]!.ruleId).toBe('tsgo/TS1005');
  });

  it('suppresses TS1005 from svelte.d.ts ambient declaration files', () => {
    const output: string = [
      'packages/shared/ui/src/svelte.d.ts(23,18): error TS1005: "," expected.',
      'src/index.ts(10,5): error TS2322: Type mismatch.',
    ].join('\n');
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('tsgo/TS2322');
  });

  it('does not suppress TS1005 from non-svelte.d.ts files', () => {
    const output: string = 'src/app.d.ts(5,1): error TS1005: ";" expected.';
    const results: LintResult[] = transformTsgoOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('tsgo/TS1005');
  });
});

describe('tsgoTool definition', () => {
  it('has correct name and command', () => {
    expect(tsgoTool.name).toBe('tsgo');
    expect(tsgoTool.command).toBe('tsgo');
    expect(tsgoTool.args).toEqual(['--noEmit']);
    expect(tsgoTool.outputFormat).toBe('text');
  });

  it('has an isAvailable function', () => {
    expect(typeof tsgoTool.isAvailable).toBe('function');
  });

  it('uses transformTsgoOutput as transform', () => {
    expect(tsgoTool.transform).toBe(transformTsgoOutput);
  });
});

// =============================================================================
// svelte-check transform
// =============================================================================

describe('transformSvelteCheckOutput', () => {
  it('parses a single ERROR diagnostic', () => {
    const output: string =
      '1711814400000 ERROR "src/App.svelte" 15:8 "Type error: cannot assign string to number"';
    const results: LintResult[] = transformSvelteCheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('svelte-check/error');
    expect(results[0]!.file).toBe('src/App.svelte');
    expect(results[0]!.line).toBe(15);
    expect(results[0]!.column).toBe(8);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toBe('Type error: cannot assign string to number');
  });

  it('parses a WARNING diagnostic', () => {
    const output: string = '1711814400000 WARNING "src/Lib.svelte" 3:1 "Unused CSS selector .foo"';
    const results: LintResult[] = transformSvelteCheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('svelte-check/warning');
    expect(results[0]!.file).toBe('src/Lib.svelte');
    expect(results[0]!.line).toBe(3);
    expect(results[0]!.column).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toBe('Unused CSS selector .foo');
  });

  it('parses multiple diagnostics', () => {
    const output: string = [
      '1711814400000 ERROR "src/A.svelte" 10:5 "Cannot find name x"',
      '1711814400001 WARNING "src/B.svelte" 20:12 "Unused variable y"',
      '1711814400002 ERROR "src/C.svelte" 1:1 "Missing semicolon"',
    ].join('\n');
    const results: LintResult[] = transformSvelteCheckOutput(output);
    expect(results).toHaveLength(3);
    expect(results[0]!.ruleId).toBe('svelte-check/error');
    expect(results[0]!.file).toBe('src/A.svelte');
    expect(results[1]!.ruleId).toBe('svelte-check/warning');
    expect(results[1]!.file).toBe('src/B.svelte');
    expect(results[2]!.ruleId).toBe('svelte-check/error');
    expect(results[2]!.file).toBe('src/C.svelte');
  });

  it('returns empty array for empty output', () => {
    expect(transformSvelteCheckOutput('')).toEqual([]);
    expect(transformSvelteCheckOutput('   ')).toEqual([]);
    expect(transformSvelteCheckOutput('\n\n')).toEqual([]);
  });

  it('skips START lines and other non-diagnostic output', () => {
    const output: string = [
      '1711814400000 START ""',
      '1711814400001 ERROR "src/App.svelte" 5:3 "Type mismatch"',
      '====================================',
      'svelte-check found 1 error',
    ].join('\n');
    const results: LintResult[] = transformSvelteCheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.ruleId).toBe('svelte-check/error');
    expect(results[0]!.message).toBe('Type mismatch');
  });

  it('handles file paths with spaces', () => {
    const output: string = '1711814400000 ERROR "src/my component.svelte" 1:1 "Parse error"';
    const results: LintResult[] = transformSvelteCheckOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]!.file).toBe('src/my component.svelte');
  });
});

describe('svelteCheckTool definition', () => {
  it('has correct name and command', () => {
    expect(svelteCheckTool.name).toBe('svelte-check');
    expect(svelteCheckTool.command).toBe('svelte-check');
    expect(svelteCheckTool.args).toEqual(['--tsconfig', './tsconfig.json']);
    expect(svelteCheckTool.outputFormat).toBe('text');
  });

  it('has an isAvailable function', () => {
    expect(typeof svelteCheckTool.isAvailable).toBe('function');
  });

  it('uses transformSvelteCheckOutput as transform', () => {
    expect(svelteCheckTool.transform).toBe(transformSvelteCheckOutput);
  });
});
