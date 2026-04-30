/**
 * Tests for workspace lint rules — split 4/4.
 *
 * Auto-split from workspace-rules.test.ts to satisfy oxlint/max-dependencies.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
import svgNoEmbeddedFont from './svg-no-embedded-font.ts';
import svgNoScript from './svg-no-script.ts';
import svgNoExternalUrl from './svg-no-external-url.ts';
import svgNoRasterImage from './svg-no-raster-image.ts';
import svgNoExternalFontUrl from './svg-no-external-font-url.ts';
import svgNoTextElement from './svg-no-text-element.ts';
import svgNoXlinkHttp from './svg-no-xlink-http.ts';
import svgRequiresNamespace from './svg-requires-namespace.ts';
import svgNoEventHandler from './svg-no-event-handler.ts';
import svgNoRemoteHref from './svg-no-remote-href.ts';
import svgNoEmbeddedMedia from './svg-no-embedded-media.ts';
import svgNoHiddenInteractive from './svg-no-hidden-interactive.ts';
import svgSymbolRequiresViewbox from './svg-symbol-requires-viewbox.ts';
import svgOpacityRequiresFill from './svg-opacity-requires-fill.ts';
import svgNoBlurFilter from './svg-no-blur-filter.ts';
import svgIdsUnique from './svg-ids-unique.ts';
import svgRequiresAriaRole from './svg-requires-aria-role.ts';
import svgNoClippedText from './svg-no-clipped-text.ts';
import svgTitleFirstChild from './svg-title-first-child.ts';
import svgNoTabindex from './svg-no-tabindex.ts';
import svgNoMaskFragment from './svg-no-mask-fragment.ts';
import svgRequiresAriaAttrs from './svg-requires-aria-attrs.ts';
import svgTitleDescRequiresLang from './svg-title-desc-requires-lang.ts';
import noWebpIcons from './no-webp-icons.ts';
import noInlineSvgInSource from './no-inline-svg-in-source.ts';
import noWebpInCss from './no-webp-in-css.ts';
import noRawSvgInComponents from './no-raw-svg-in-components.ts';
import webpMaxSize from './webp-max-size.ts';
import webpNoLossless from './webp-no-lossless.ts';
import webpNoMetadata from './webp-no-metadata.ts';
import icoMinResolution from './ico-min-resolution.ts';
import noMisleadingImageExtension from './no-misleading-image-extension.ts';
import svgValidXml from './svg-valid-xml.ts';
import icoRequiresMultiresolution from './ico-requires-multiresolution.ts';
import icoOptimalPalette from './ico-optimal-palette.ts';
import webpNoColorProfile from './webp-no-color-profile.ts';
import webpYuv420Required from './webp-yuv420-required.ts';
import gitlabCiFileRequired from './gitlab-ci-file-required.ts';
import gitlabCiSchemaHeader from './gitlab-ci-schema-header.ts';
import gitlabCiYamlSyntax from './gitlab-ci-yaml-syntax.ts';
import gitlabCiStagesDeclared from './gitlab-ci-stages-declared.ts';
import gitlabCiIncludesValid from './gitlab-ci-includes-valid.ts';
import shellFunctionDocblocks from './shell-function-docblocks.ts';
import gitlabCiJobsHaveScript from './gitlab-ci-jobs-have-script.ts';
import gitlabCiStandardNaming from './gitlab-ci-standard-naming.ts';
import wranglerAuthenticated from './wrangler-authenticated.ts';
import gitlabCiStagesStandard from './gitlab-ci-stages-standard.ts';
import cliToolsHelpVersion from './cli-tools-help-version.ts';
import workspaceSpelling from './workspace-spelling.ts';
import mrTitleFormat from './mr-title-format.ts';
import mrDescriptionRequired from './mr-description-required.ts';
import mrLabelEnforcement from './mr-label-enforcement.ts';
import mrTargetBranchProtected from './mr-target-branch-protected.ts';
import mrDraftBlock from './mr-draft-block.ts';
import mrConflictingLabels from './mr-conflicting-labels.ts';
import mrSizeLimit from './mr-size-limit.ts';
import mrAssigneeRequired from './mr-assignee-required.ts';
import mrReviewerRequired from './mr-reviewer-required.ts';
import mrBlockingDiscussions from './mr-blocking-discussions.ts';
import mrWipCommitCheck from './mr-wip-commit-check.ts';
import mrApprovalRequired from './mr-approval-required.ts';
import mrBranchSourceRules from './mr-branch-source-rules.ts';
import mrCodeownersApproval from './mr-codeowners-approval.ts';
import mrLabelsRequiredPerScope from './mr-labels-required-per-scope.ts';
import mrDependencyChangesReviewed from './mr-dependency-changes-reviewed.ts';
import mrCiPipelinePassed from './mr-ci-pipeline-passed.ts';
import mrUpToDateWithTarget from './mr-up-to-date-with-target.ts';
import mrCherryPickLabel from './mr-cherry-pick-label.ts';
import mrTestCoverageDiff from './mr-test-coverage-diff.ts';
import mrLabelFormat from './mr-label-format.ts';
import mrReleaseLabelRequired from './mr-release-label-required.ts';
import mrNoForcePushAfterReview from './mr-no-force-push-after-review.ts';
import mrLicenseChangeReviewed from './mr-license-change-reviewed.ts';
import mrConfigChangesApproved from './mr-config-changes-approved.ts';
import mrOpenTooLong from './mr-open-too-long.ts';
import mrAutomergeNotEnabledByDefault from './mr-automerge-not-enabled-by-default.ts';
import mrLabelConflictMatrix from './mr-label-conflict-matrix.ts';
import mrSensitivePathChanges from './mr-sensitive-path-changes.ts';
import mrTestOrBenchmarkRegressions from './mr-test-or-benchmark-regressions.ts';
import valibotConsistency from './valibot-consistency.ts';
import vitestConfigAndCoverage from './vitest-config-and-coverage.ts';
import vitestConfigAndUsage from './vitest-config-and-usage.ts';
import prSvgOptimized from './pr-svg-optimized.ts';
import prBranchCommitMismatch from './pr-branch-commit-mismatch.ts';
import prDescriptionRequired from './pr-description-required.ts';
import prNoMergeCommits from './pr-no-merge-commits.ts';
import prWipWarning from './pr-wip-warning.ts';
import syncTurboTasks from './sync-turbo-tasks.ts';
import syncTsconfigPaths from './sync-tsconfig-paths.ts';
import syncLefthookScripts from './sync-lefthook-scripts.ts';
import syncOnboardingSteps from './sync-onboarding-steps.ts';
import syncWorkflowScripts from './sync-workflow-scripts.ts';
import syncFilterPatterns from './sync-filter-patterns.ts';
import syncPnpmWorkspace from './sync-pnpm-workspace.ts';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a mock WorkspaceContext for testing.
 *
 * @param overrides - Context overrides
 * @returns Mock WorkspaceContext
 */
function mockContext(
  overrides: { rootDir?: string; files?: Map<string, string>; packages?: WorkspacePackage[] } = {},
): WorkspaceContext {
  const files: Map<string, string> = overrides.files ?? new Map();
  const packages: WorkspacePackage[] = overrides.packages ?? [];

  return {
    allFiles: async (): Promise<readonly string[]> => [...files.keys()],
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      [...files.keys()].filter((f: string): boolean =>
        exts.some((ext: string): boolean => f.endsWith(ext)),
      ),
    dirExists: (_path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(true);
      }),
    fileExists: (path: string): Promise<boolean> =>
      new Promise<boolean>((resolve: (v: boolean) => void): void => {
        resolve(files.has(path));
      }),
    getWorkspacePackages: (): Promise<WorkspacePackage[]> =>
      new Promise<WorkspacePackage[]>((resolve: (v: WorkspacePackage[]) => void): void => {
        resolve(packages);
      }),
    readFile: (path: string): Promise<string> =>
      new Promise<string>((resolve: (v: string) => void, reject: (e: Error) => void): void => {
        const content: string | undefined = files.get(path);

        if (content === undefined) {
          reject(new Error(`File not found: ${path}`));
          return;
        }
        resolve(content);
      }),
    rootDir: overrides.rootDir ?? '/workspace',
  };
}

// =============================================================================
// workspace/workspace-valid
// =============================================================================

describe('workspace/svg-no-embedded-font', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEmbeddedFont.id).toBe('workspace/svg-no-embedded-font');
    expect(svgNoEmbeddedFont.scope).toBe('workspace');
    expect(typeof svgNoEmbeddedFont.check).toBe('function');
  });

  it('errors when SVG has data:font/', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(data:font/woff2;base64,abc)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Embedded font');
  });

  it('errors when SVG has .woff reference', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>@font-face{src:url(font.woff)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has .ttf reference', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>@font-face{src:url(font.ttf)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has <font element', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><font id="MyFont"><font-face font-family="MyFont"/></font></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no fonts', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedFont.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-script', () => {
  it('has correct rule metadata', () => {
    expect(svgNoScript.id).toBe('workspace/svg-no-script');
    expect(svgNoScript.scope).toBe('workspace');
    expect(typeof svgNoScript.check).toBe('function');
  });

  it('errors when SVG has <script> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><script>alert("xss")</script></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('<script>');
  });

  it('errors case-insensitively on <SCRIPT>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><SCRIPT>alert("xss")</SCRIPT></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no script', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoScript.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-external-url', () => {
  it('has correct rule metadata', () => {
    expect(svgNoExternalUrl.id).toBe('workspace/svg-no-external-url');
    expect(svgNoExternalUrl.scope).toBe('workspace');
    expect(typeof svgNoExternalUrl.check).toBe('function');
  });

  it('errors when SVG has url(http://...)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>div{background:url(http://evil.com/img.png)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('External URL');
  });

  it('errors when SVG has url(https://...)', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>div{background:url(https://cdn.com/bg.png)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has local url()', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><style>div{fill:url(#gradient)}</style></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalUrl.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-raster-image', () => {
  it('has correct rule metadata', () => {
    expect(svgNoRasterImage.id).toBe('workspace/svg-no-raster-image');
    expect(svgNoRasterImage.scope).toBe('workspace');
    expect(typeof svgNoRasterImage.check).toBe('function');
  });

  it('errors when SVG has base64 PNG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/png;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('raster image');
  });

  it('errors when SVG has base64 JPEG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/jpeg;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has base64 GIF', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="data:image/gif;base64,abc123"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no raster embeds', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRasterImage.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-external-font-url', () => {
  it('has correct rule metadata', () => {
    expect(svgNoExternalFontUrl.id).toBe('workspace/svg-no-external-font-url');
    expect(svgNoExternalFontUrl.scope).toBe('workspace');
    expect(typeof svgNoExternalFontUrl.check).toBe('function');
  });

  it('errors when SVG has external woff URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url("https://fonts.com/font.woff")}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('External font URL');
  });

  it('errors when SVG has external woff2 URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(https://cdn.com/f.woff2)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has external ttf URL', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><style>@font-face{src:url(http://fonts.com/f.ttf)}</style></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no external font references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoExternalFontUrl.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-text-element', () => {
  it('has correct rule metadata', () => {
    expect(svgNoTextElement.id).toBe('workspace/svg-no-text-element');
    expect(svgNoTextElement.scope).toBe('workspace');
    expect(typeof svgNoTextElement.check).toBe('function');
  });

  it('warns when SVG has <text> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text x="10" y="10">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTextElement.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('<text>');
  });

  it('passes when SVG has no text elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTextElement.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-xlink-http', () => {
  it('has correct rule metadata', () => {
    expect(svgNoXlinkHttp.id).toBe('workspace/svg-no-xlink-http');
    expect(svgNoXlinkHttp.scope).toBe('workspace');
    expect(typeof svgNoXlinkHttp.check).toBe('function');
  });

  it('errors when SVG has insecure xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="http://evil.com/icon.svg#id"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('xlink:href');
  });

  it('passes when SVG uses local xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="#local-id"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no xlink:href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoXlinkHttp.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-requires-namespace', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresNamespace.id).toBe('workspace/svg-requires-namespace');
    expect(svgRequiresNamespace.scope).toBe('workspace');
    expect(typeof svgRequiresNamespace.check).toBe('function');
  });

  it('errors when SVG is missing xmlns', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresNamespace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('xmlns');
  });

  it('passes when SVG has xmlns', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresNamespace.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-event-handler', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEventHandler.id).toBe('workspace/svg-no-event-handler');
    expect(svgNoEventHandler.scope).toBe('workspace');
    expect(typeof svgNoEventHandler.check).toBe('function');
  });

  it('errors when SVG has onclick handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect onclick="alert(1)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('event handler');
  });

  it('errors when SVG has onload handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg onload="init()"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has onmouseover handler', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect onmouseover="highlight()"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no event handlers', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEventHandler.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-remote-href', () => {
  it('has correct rule metadata', () => {
    expect(svgNoRemoteHref.id).toBe('workspace/svg-no-remote-href');
    expect(svgNoRemoteHref.scope).toBe('workspace');
    expect(typeof svgNoRemoteHref.check).toBe('function');
  });

  it('errors when SVG has href to HTTP URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a href="http://evil.com"><rect/></a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Remote href');
  });

  it('errors when SVG has xlink:href to HTTPS URL', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use xlink:href="https://cdn.com/icons.svg#x"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has local href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><use href="#local-symbol"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no href', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoRemoteHref.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-embedded-media', () => {
  it('has correct rule metadata', () => {
    expect(svgNoEmbeddedMedia.id).toBe('workspace/svg-no-embedded-media');
    expect(svgNoEmbeddedMedia.scope).toBe('workspace');
    expect(typeof svgNoEmbeddedMedia.check).toBe('function');
  });

  it('errors when SVG has <image> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><image href="photo.png" width="100" height="100"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Embedded media');
  });

  it('errors when SVG has <video> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><foreignObject><video src="clip.mp4"/></foreignObject></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
  });

  it('errors when SVG has <audio> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><foreignObject><audio src="sound.mp3"/></foreignObject></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(1);
  });

  it('passes when SVG has no media elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBe(0);
  });

  it('flags multiple media types in one SVG', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icon.svg',
        '<svg><image href="x.png"/><foreignObject><video src="y.mp4"/><audio src="z.mp3"/></foreignObject></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoEmbeddedMedia.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('workspace/svg-no-hidden-interactive', () => {
  it('has correct rule metadata', () => {
    expect(svgNoHiddenInteractive.id).toBe('workspace/svg-no-hidden-interactive');
    expect(svgNoHiddenInteractive.scope).toBe('workspace');
    expect(typeof svgNoHiddenInteractive.check).toBe('function');
  });

  it('errors when SVG has hidden <a> with display:none', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a style="display: none" href="/link">click</a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when SVG has hidden <button> with opacity:0', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><button style="opacity: 0">submit</button></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when SVG has visible interactive elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><a href="/link">visible link</a></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.ts', '<a style="display: none">hidden</a>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgNoHiddenInteractive.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-symbol-requires-viewbox', () => {
  it('has correct rule metadata', () => {
    expect(svgSymbolRequiresViewbox.id).toBe('workspace/svg-symbol-requires-viewbox');
    expect(svgSymbolRequiresViewbox.scope).toBe('workspace');
    expect(typeof svgSymbolRequiresViewbox.check).toBe('function');
  });

  it('errors when <symbol> has no viewBox', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icons.svg', '<svg><symbol id="icon"><path d="M0 0"/></symbol></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when <symbol> has viewBox', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/icons.svg',
        '<svg><symbol id="icon" viewBox="0 0 24 24"><path d="M0 0"/></symbol></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no <symbol> elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.ts', '<symbol id="test">no viewBox</symbol>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgSymbolRequiresViewbox.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-opacity-requires-fill', () => {
  it('has correct rule metadata', () => {
    expect(svgOpacityRequiresFill.id).toBe('workspace/svg-opacity-requires-fill');
    expect(svgOpacityRequiresFill.scope).toBe('workspace');
    expect(typeof svgOpacityRequiresFill.check).toBe('function');
  });

  it('warns when SVG has opacity= but no fill=', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect opacity="0.5"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has both opacity= and fill=', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect opacity="0.5" fill="#000"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no opacity attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect fill="#000"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.css', 'div { opacity: 0.5; }']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgOpacityRequiresFill.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-blur-filter', () => {
  it('has correct rule metadata', () => {
    expect(svgNoBlurFilter.id).toBe('workspace/svg-no-blur-filter');
    expect(svgNoBlurFilter.scope).toBe('workspace');
    expect(typeof svgNoBlurFilter.check).toBe('function');
  });

  it('warns when SVG has feGaussianBlur', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><filter><feGaussianBlur stdDeviation="5"/></filter></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SVG has blur() CSS function', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect style="filter: blur(4px)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no blur filters', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.css', 'div { filter: blur(4px); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoBlurFilter.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-ids-unique', () => {
  it('has correct rule metadata', () => {
    expect(svgIdsUnique.id).toBe('workspace/svg-ids-unique');
    expect(svgIdsUnique.scope).toBe('workspace');
    expect(typeof svgIdsUnique.check).toBe('function');
  });

  it('errors when same ID appears in different SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle id="icon"/></svg>'],
      ['/workspace/b.svg', '<svg><rect id="icon"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when all IDs are unique across files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle id="circle-1"/></svg>'],
      ['/workspace/b.svg', '<svg><rect id="rect-1"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG files have no IDs', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/a.svg', '<svg><circle/></svg>'],
      ['/workspace/b.svg', '<svg><rect/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<div id="icon"></div>'],
      ['/workspace/page.html', '<div id="icon"></div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgIdsUnique.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-requires-aria-role', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresAriaRole.id).toBe('workspace/svg-requires-aria-role');
    expect(svgRequiresAriaRole.scope).toBe('workspace');
    expect(typeof svgRequiresAriaRole.check).toBe('function');
  });

  it('warns when SVG has no ARIA role', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has role="img"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="img" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="presentation"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="presentation"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="graphics-symbol"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="graphics-symbol"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.html', '<div>no role</div>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaRole.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-clipped-text', () => {
  it('has correct rule metadata', () => {
    expect(svgNoClippedText.id).toBe('workspace/svg-no-clipped-text');
    expect(svgNoClippedText.scope).toBe('workspace');
    expect(typeof svgNoClippedText.check).toBe('function');
  });

  it('warns when SVG text has overflow attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text overflow="hidden">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SVG text has clip-path', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text clip-path="url(#clip)">Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG text has no clipping attributes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><text>Hello</text></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no text elements', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<text overflow="hidden">test</text>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoClippedText.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-title-first-child', () => {
  it('has correct rule metadata', () => {
    expect(svgTitleFirstChild.id).toBe('workspace/svg-title-first-child');
    expect(svgTitleFirstChild.scope).toBe('workspace');
    expect(typeof svgTitleFirstChild.check).toBe('function');
  });

  it('warns when SVG has no <title> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has <title> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/index.html', '<html><head><title>Page</title></head></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgTitleFirstChild.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-tabindex', () => {
  it('has correct rule metadata', () => {
    expect(svgNoTabindex.id).toBe('workspace/svg-no-tabindex');
    expect(svgNoTabindex.scope).toBe('workspace');
    expect(typeof svgNoTabindex.check).toBe('function');
  });

  it('warns when SVG has tabindex attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg tabindex="0" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no tabindex', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/app.html', '<div tabindex="0">focusable</div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoTabindex.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-no-mask-fragment', () => {
  it('has correct rule metadata', () => {
    expect(svgNoMaskFragment.id).toBe('workspace/svg-no-mask-fragment');
    expect(svgNoMaskFragment.scope).toBe('workspace');
    expect(typeof svgNoMaskFragment.check).toBe('function');
  });

  it('warns when SVG has mask="url(#...)"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><rect mask="url(#myMask)"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has no mask fragments', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.css', 'div { mask: url(#id); }']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgNoMaskFragment.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-requires-aria-attrs', () => {
  it('has correct rule metadata', () => {
    expect(svgRequiresAriaAttrs.id).toBe('workspace/svg-requires-aria-attrs');
    expect(svgRequiresAriaAttrs.scope).toBe('workspace');
    expect(typeof svgRequiresAriaAttrs.check).toBe('function');
  });

  it('warns when SVG has no ARIA attributes', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when SVG has role="img"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="img" viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has role="presentation"', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg role="presentation"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has aria-label', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg aria-label="close icon"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has aria-hidden', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg aria-hidden="true"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.html', '<div>no aria</div>']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgRequiresAriaAttrs.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/svg-title-desc-requires-lang', () => {
  it('has correct rule metadata', () => {
    expect(svgTitleDescRequiresLang.id).toBe('workspace/svg-title-desc-requires-lang');
    expect(svgTitleDescRequiresLang.scope).toBe('workspace');
    expect(typeof svgTitleDescRequiresLang.check).toBe('function');
  });

  it('warns when <title> has no lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('title');
  });

  it('warns when <desc> has no lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><desc>A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('desc');
  });

  it('warns twice when both <title> and <desc> lack lang', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title>Icon</title><desc>A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(2);
  });

  it('passes when <title> has lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><title lang="en">Icon</title></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when <desc> has lang attribute', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg><desc lang="en">A nice icon</desc></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when SVG has no title or desc', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-SVG files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/page.html', '<title>Page Title</title>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgTitleDescRequiresLang.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-webp-icons', () => {
  it('has correct rule metadata', () => {
    expect(noWebpIcons.id).toBe('workspace/no-webp-icons');
    expect(noWebpIcons.scope).toBe('workspace');
    expect(typeof noWebpIcons.check).toBe('function');
  });

  it('errors when .webp file contains "icon" in name', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/app-icon.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when file is favicon.webp', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/favicon.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for regular .webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/hero-image.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .ico icon files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes for .svg icon files', async () => {
    const files: Map<string, string> = new Map([['/workspace/public/icon.svg', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpIcons.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-inline-svg-in-source', () => {
  it('has correct rule metadata', () => {
    expect(noInlineSvgInSource.id).toBe('workspace/no-inline-svg-in-source');
    expect(noInlineSvgInSource.scope).toBe('workspace');
    expect(typeof noInlineSvgInSource.check).toBe('function');
  });

  it('errors when .tsx file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/App.tsx',
        'export default () => <svg viewBox="0 0 24 24"><path d="M0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .jsx file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.jsx', 'export default () => <svg><circle r="5"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .html file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/public/index.html', '<html><body><svg><rect/></svg></body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .md file contains inline <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/docs/readme.md', '# Title\n<svg viewBox="0 0 10 10"><circle r="1"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when source files have no inline SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.tsx', 'export default () => <div>Hello</div>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-source files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.tsx'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noInlineSvgInSource.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-webp-in-css', () => {
  it('has correct rule metadata', () => {
    expect(noWebpInCss.id).toBe('workspace/no-webp-in-css');
    expect(noWebpInCss.scope).toBe('workspace');
    expect(typeof noWebpInCss.check).toBe('function');
  });

  it('warns when CSS file has url() referencing .webp', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.css', 'body { background-image: url(hero.webp); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when SCSS file has url() referencing .webp', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.scss', '.hero { background: url("bg.webp"); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when CSS file has no .webp references', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/styles/main.css', 'body { background-image: url(hero.svg); }'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CSS files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/App.tsx', 'const bg = "url(hero.webp)"'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.css'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noWebpInCss.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/no-raw-svg-in-components', () => {
  it('has correct rule metadata', () => {
    expect(noRawSvgInComponents.id).toBe('workspace/no-raw-svg-in-components');
    expect(noRawSvgInComponents.scope).toBe('workspace');
    expect(typeof noRawSvgInComponents.check).toBe('function');
  });

  it('errors when .svelte file contains raw <svg>', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/Icon.svelte',
        '<script>export let name;</script>\n<svg viewBox="0 0 24 24"><path d="M0"/></svg>',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when .tsx file contains raw <svg>', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.tsx', 'export const Icon = () => <svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when component files have no raw SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.svelte', '<script>export let name;</script>\n<Icon {name} />'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-component files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .jsx files (only .svelte and .tsx targeted)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/Icon.jsx', 'export const Icon = () => <svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svelte'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noRawSvgInComponents.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/webp-max-size', () => {
  it('has correct rule metadata', () => {
    expect(webpMaxSize.id).toBe('workspace/webp-max-size');
    expect(webpMaxSize.scope).toBe('workspace');
    expect(typeof webpMaxSize.check).toBe('function');
  });

  it('warns when .webp file exceeds 250KB', async () => {
    const largeContent: string = 'x'.repeat(256_001);
    const files: Map<string, string> = new Map([['/workspace/hero.webp', largeContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp file is under 250KB', async () => {
    const smallContent: string = 'x'.repeat(100_000);
    const files: Map<string, string> = new Map([['/workspace/icon.webp', smallContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/big.png', 'x'.repeat(500_000)]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpMaxSize.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/webp-no-lossless', () => {
  it('has correct rule metadata', () => {
    expect(webpNoLossless.id).toBe('workspace/webp-no-lossless');
    expect(webpNoLossless.scope).toBe('workspace');
    expect(typeof webpNoLossless.check).toBe('function');
  });

  it('warns when .webp uses lossless VP8L encoding', async () => {
    const { readFileSync } = await import('node:fs');
    // Build a minimal RIFF/WEBP header with VP8L chunk
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8L', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses lossy VP8 encoding', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8 ', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .webp files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoLossless.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/webp-no-metadata', () => {
  it('has correct rule metadata', () => {
    expect(webpNoMetadata.id).toBe('workspace/webp-no-metadata');
    expect(webpNoMetadata.scope).toBe('workspace');
    expect(typeof webpNoMetadata.check).toBe('function');
  });

  it('warns when .webp contains ICC_PROFILE', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPICC_PROFILEdata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains XMP', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.webp', 'RIFFWEBPsomeXMPdata']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains Exif', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.webp', 'RIFFWEBPsomeExifdata']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp has no metadata strings', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 cleandata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', 'ICC_PROFILE']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpNoMetadata.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/ico-min-resolution', () => {
  it('has correct rule metadata', () => {
    expect(icoMinResolution.id).toBe('workspace/ico-min-resolution');
    expect(icoMinResolution.scope).toBe('workspace');
    expect(typeof icoMinResolution.check).toBe('function');
  });

  it('warns when ICO has resolution below 64x64', async () => {
    const { readFileSync } = await import('node:fs');
    // ICO header: 00 00 01 00 (magic), 01 00 (1 image)
    // ICONDIRENTRY at offset 6: width=32, height=32
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1; // type = 1 (ICO)
    buf.writeUInt16LE(1, 4); // 1 image
    buf[6] = 32; // width
    buf[7] = 32; // height
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 64x64 resolution', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 64; // width
    buf[7] = 64; // height
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 256x256 resolution (width=0 means 256)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 0; // width=0 → 256
    buf[7] = 0; // height=0 → 256
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoMinResolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/no-misleading-image-extension', () => {
  it('has correct rule metadata', () => {
    expect(noMisleadingImageExtension.id).toBe('workspace/no-misleading-image-extension');
    expect(noMisleadingImageExtension.scope).toBe('workspace');
    expect(typeof noMisleadingImageExtension.check).toBe('function');
  });

  it('errors when .svg file does not start with XML/SVG content', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', 'This is not an SVG at all'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes when .svg starts with <svg', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when .svg starts with <?xml', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<?xml version="1.0"?><svg><path/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when .svg starts with <!DOCTYPE', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when .webp file has wrong RIFF header', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(12);
    buf.write('NOTARIFF', 0, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp has correct RIFF/WEBP header', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(12);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(100, 4);
    buf.write('WEBP', 8, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('errors when .ico file has wrong magic bytes', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .ico has correct magic bytes', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.from([0x00, 0x00, 0x01, 0x00]);
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-image files', async () => {
    const files: Map<string, string> = new Map([['/workspace/app.ts', 'const x = 1;']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips SVG files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .webp files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .ico files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await noMisleadingImageExtension.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/svg-valid-xml', () => {
  it('has correct rule metadata', () => {
    expect(svgValidXml.id).toBe('workspace/svg-valid-xml');
    expect(svgValidXml.scope).toBe('workspace');
    expect(typeof svgValidXml.check).toBe('function');
  });

  it('errors when SVG has no <svg> element', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<html><body>Not an SVG</body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('errors when SVG has unclosed <svg> tag', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
  });

  it('passes for well-formed SVG', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/icon.svg', '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.svg files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/index.html', '<html><body></body></html>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.svg'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await svgValidXml.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/ico-requires-multiresolution', () => {
  it('has correct rule metadata', () => {
    expect(icoRequiresMultiresolution.id).toBe('workspace/ico-requires-multiresolution');
    expect(icoRequiresMultiresolution.scope).toBe('workspace');
    expect(typeof icoRequiresMultiresolution.check).toBe('function');
  });

  it('errors when ICO has fewer than 3 images', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(6);
    buf[2] = 1; // type = ICO
    buf.writeUInt16LE(1, 4); // 1 image
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO has 3 or more images', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(6);
    buf[2] = 1;
    buf.writeUInt16LE(3, 4); // 3 images
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(4) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoRequiresMultiresolution.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/ico-optimal-palette', () => {
  it('has correct rule metadata', () => {
    expect(icoOptimalPalette.id).toBe('workspace/ico-optimal-palette');
    expect(icoOptimalPalette.scope).toBe('workspace');
    expect(typeof icoOptimalPalette.check).toBe('function');
  });

  it('warns when ICO uses 32-bit color (colorCount=0)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1; // type = ICO
    buf.writeUInt16LE(1, 4);
    buf[6] = 64; // width
    buf[7] = 64; // height
    buf[8] = 0; // colorCount=0 means ≥256 colors
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when ICO uses 256 or fewer colors', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(22);
    buf[2] = 1;
    buf.writeUInt16LE(1, 4);
    buf[6] = 64;
    buf[7] = 64;
    buf[8] = 128; // 128 colors
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/favicon.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips ICO files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(5) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.ico files', async () => {
    const files: Map<string, string> = new Map([['/workspace/icon.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.ico', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await icoOptimalPalette.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/webp-no-color-profile', () => {
  it('has correct rule metadata', () => {
    expect(webpNoColorProfile.id).toBe('workspace/webp-no-color-profile');
    expect(webpNoColorProfile.scope).toBe('workspace');
    expect(typeof webpNoColorProfile.check).toBe('function');
  });

  it('warns when .webp contains ICCP chunk', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 dataICCPprofiledata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('warns when .webp contains EXIF chunk', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 dataEXIFmetadata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
  });

  it('passes when .webp has no color profiles', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/photo.webp', 'RIFFWEBPVP8 cleandata'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', 'ICCP data']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = {
      ...mockContext(),
      allFiles: async (): Promise<readonly string[]> => ['/workspace/bad.webp'],
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await webpNoColorProfile.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/webp-yuv420-required', () => {
  it('has correct rule metadata', () => {
    expect(webpYuv420Required.id).toBe('workspace/webp-yuv420-required');
    expect(webpYuv420Required.scope).toBe('workspace');
    expect(typeof webpYuv420Required.check).toBe('function');
  });

  it('warns when .webp uses VP8L (lossless, not YUV420)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8L', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses VP8 (lossy, YUV420)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8 ', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('passes when .webp uses VP8X (extended)', async () => {
    const { readFileSync } = await import('node:fs');
    const buf: Buffer = Buffer.alloc(16);
    buf.write('RIFF', 0, 'ascii');
    buf.writeUInt32LE(8, 4);
    buf.write('WEBP', 8, 'ascii');
    buf.write('VP8X', 12, 'ascii');
    vi.mocked(readFileSync).mockReturnValue(buf as never);
    const files: Map<string, string> = new Map([['/workspace/photo.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips .webp files too small for header', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue(Buffer.alloc(10) as never);
    const files: Map<string, string> = new Map([['/workspace/tiny.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });

  it('skips non-.webp files', async () => {
    const files: Map<string, string> = new Map([['/workspace/photo.png', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const files: Map<string, string> = new Map([['/workspace/bad.webp', '']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await webpYuv420Required.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(readFileSync).mockReset();
  });
});

describe('workspace/gitlab-ci-file-required', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiFileRequired.id).toBe('workspace/gitlab-ci-file-required');
    expect(gitlabCiFileRequired.scope).toBe('workspace');
    expect(typeof gitlabCiFileRequired.check).toBe('function');
  });

  it('reports error when .gitlab-ci.yml is missing', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiFileRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('workspace/gitlab-ci-file-required');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Missing .gitlab-ci.yml');
  });

  it('passes when .gitlab-ci.yml exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiFileRequired.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-schema-header', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiSchemaHeader.id).toBe('workspace/gitlab-ci-schema-header');
    expect(gitlabCiSchemaHeader.scope).toBe('workspace');
    expect(typeof gitlabCiSchemaHeader.check).toBe('function');
  });

  it('reports error when CI YAML is missing schema header', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing required YAML schema header');
  });

  it('passes when CI YAML has correct schema header', async () => {
    const header: string =
      '# yaml-language-server: $schema=https://gitlab.com/gitlab-org/gitlab/-/raw/master/app/assets/javascripts/editor/schema/ci.json';
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', `${header}\nstages:\n  - build\n`],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'key: value\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks nested CI YAML files under .gitlab/ci/', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiSchemaHeader.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('missing required YAML schema header');
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiSchemaHeader.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-yaml-syntax', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiYamlSyntax.id).toBe('workspace/gitlab-ci-yaml-syntax');
    expect(gitlabCiYamlSyntax.scope).toBe('workspace');
    expect(typeof gitlabCiYamlSyntax.check).toBe('function');
  });

  it('reports error for tab indentation in CI YAML', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n\t- build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Tab character');
  });

  it('reports error for unbalanced braces', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'variables: {\n  KEY: value\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('Unbalanced braces');
  });

  it('passes for valid CI YAML', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n  - test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/data.yml', '\t- bad tabs\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiYamlSyntax.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiYamlSyntax.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-stages-declared', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStagesDeclared.id).toBe('workspace/gitlab-ci-stages-declared');
    expect(gitlabCiStagesDeclared.scope).toBe('workspace');
    expect(typeof gitlabCiStagesDeclared.check).toBe('function');
  });

  it('reports error when .gitlab-ci.yml lacks stages:', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'build:\n  script: echo hi\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain("Missing required top-level 'stages:'");
  });

  it('passes when stages: is present (list format)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n  - test\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when stages: is present (inline format)', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages: [build, test]\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when .gitlab-ci.yml does not exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesDeclared.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-includes-valid', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiIncludesValid.id).toBe('workspace/gitlab-ci-includes-valid');
    expect(gitlabCiIncludesValid.scope).toBe('workspace');
    expect(typeof gitlabCiIncludesValid.check).toBe('function');
  });

  it('reports error for broken include paths', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/.gitlab-ci.yml',
        'include:\n  - local: .gitlab/ci/deploy.yml\n  - local: .gitlab/ci/missing.yml\n',
      ],
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('.gitlab/ci/missing.yml');
  });

  it('passes when all include paths exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'include:\n  - local: .gitlab/ci/deploy.yml\n'],
      ['/workspace/.gitlab/ci/deploy.yml', 'deploy:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no includes are present', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'stages:\n  - build\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips when .gitlab-ci.yml does not exist', async () => {
    const files: Map<string, string> = new Map([['/workspace/package.json', '{}']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiIncludesValid.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/shell-function-docblocks', () => {
  it('has correct rule metadata', () => {
    expect(shellFunctionDocblocks.id).toBe('workspace/shell-function-docblocks');
    expect(shellFunctionDocblocks.scope).toBe('workspace');
    expect(typeof shellFunctionDocblocks.check).toBe('function');
  });

  it('reports error for missing Check/Category/Stages comments', async () => {
    const shContent: string = ['check::my_func() {', '  log FATAL "error"', '  return 1', '}'].join(
      '\n',
    );
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(3);
    expect(results.some((r: LintResult): boolean => r.message.includes("'# ✅ Check:'"))).toBe(
      true,
    );
    expect(results.some((r: LintResult): boolean => r.message.includes("'# Category:'"))).toBe(
      true,
    );
    expect(results.some((r: LintResult): boolean => r.message.includes("'# Stages:'"))).toBe(true);
  });

  it('reports error for raw echo/printf', async () => {
    const shContent: string = [
      'check::bad_echo() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  echo "bad output"',
      '  return 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('raw echo/printf'))).toBe(
      true,
    );
  });

  it('reports error for exit 1 instead of return 1', async () => {
    const shContent: string = [
      'check::bad_exit() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  log FATAL "error"',
      '  exit 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("'exit 1'"))).toBe(true);
  });

  it('reports error for log FATAL without return 1', async () => {
    const shContent: string = [
      'check::no_return() {',
      '  # ✅ Check: test',
      '  # Category: test',
      '  # Stages: test',
      '  log FATAL "error"',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("missing 'return 1'"))).toBe(
      true,
    );
  });

  it('passes for properly formatted function', async () => {
    const shContent: string = [
      'check::good_func() {',
      '  # ✅ Check: validates good things',
      '  # Category: test',
      '  # Stages: lint, check',
      '  log FATAL "error found"',
      '  return 1',
      '}',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/checks.sh', shContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-.sh files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/script.ts', 'check::my_func() {\n}\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await shellFunctionDocblocks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/checks.sh', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await shellFunctionDocblocks.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-jobs-have-script', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiJobsHaveScript.id).toBe('workspace/gitlab-ci-jobs-have-script');
    expect(gitlabCiJobsHaveScript.scope).toBe('workspace');
    expect(typeof gitlabCiJobsHaveScript.check).toBe('function');
  });

  it('reports error for CI job without script:', async () => {
    const content: string = ['stages:', '  - build', 'build:', '  stage: build'].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain("'build'");
    expect(results[0]!.message).toContain('missing a script:');
  });

  it('passes when all jobs have script:', async () => {
    const content: string = [
      'stages:',
      '  - build',
      'build:',
      '  stage: build',
      '  script:',
      '    - echo "building"',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-job keys like stages/include/default', async () => {
    const content: string = [
      'stages:',
      '  - build',
      'include:',
      '  - local: ci.yml',
      'variables:',
      '  KEY: val',
    ].join('\n');
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'job:\n  no_script: true\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiJobsHaveScript.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/gitlab-ci-standard-naming', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStandardNaming.id).toBe('workspace/gitlab-ci-standard-naming');
    expect(gitlabCiStandardNaming.scope).toBe('workspace');
    expect(typeof gitlabCiStandardNaming.check).toBe('function');
  });

  it('warns for non-standard job name', async () => {
    const content: string = 'custom_job:\n  script: echo\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('custom_job');
  });

  it('warns for non-standard stage value', async () => {
    const content: string = 'build:\n  stage: custom_stage\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('custom_stage'))).toBe(true);
  });

  it('passes for standard job name and stage', async () => {
    const content: string = 'build:\n  stage: build\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/config.yml', 'bad_name:\n  stage: bad\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStandardNaming.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiStandardNaming.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/wrangler-authenticated', () => {
  it('has correct rule metadata', () => {
    expect(wranglerAuthenticated.id).toBe('workspace/wrangler-authenticated');
    expect(wranglerAuthenticated.scope).toBe('workspace');
    expect(typeof wranglerAuthenticated.check).toBe('function');
  });

  it('warns when wrangler whoami fails', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Not authenticated');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await wranglerAuthenticated.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not authenticated');
    vi.mocked(execSync).mockReset();
  });

  it('passes when wrangler whoami succeeds', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(Buffer.from('user@example.com') as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await wranglerAuthenticated.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
  });
});

describe('workspace/gitlab-ci-stages-standard', () => {
  it('has correct rule metadata', () => {
    expect(gitlabCiStagesStandard.id).toBe('workspace/gitlab-ci-stages-standard');
    expect(gitlabCiStagesStandard.scope).toBe('workspace');
    expect(typeof gitlabCiStagesStandard.check).toBe('function');
  });

  it('reports error for missing required stages', async () => {
    const content: string = 'stages:\n  - build\n  - test\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r: LintResult): boolean => r.message.includes('Missing required'))).toBe(
      true,
    );
  });

  it('reports error for unapproved stages', async () => {
    const stages: string[] = [
      'setup',
      'check',
      'lint',
      'test',
      'build',
      'migrate',
      'deploy',
      'integration',
      'docs',
      'custom',
    ];
    const content: string = `stages:\n${stages.map((s: string): string => `  - ${s}`).join('\n')}\n`;
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes("'custom'"))).toBe(true);
  });

  it('reports error for incorrect stage order', async () => {
    const content: string =
      'stages:\n  - test\n  - setup\n  - check\n  - lint\n  - build\n  - migrate\n  - deploy\n  - integration\n  - docs\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Incorrect stage order')),
    ).toBe(true);
  });

  it('passes when all stages are correct and in order', async () => {
    const content: string =
      'stages:\n  - setup\n  - check\n  - lint\n  - test\n  - build\n  - migrate\n  - deploy\n  - integration\n  - docs\n';
    const files: Map<string, string> = new Map([['/workspace/.gitlab-ci.yml', content]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-CI YAML files', async () => {
    const files: Map<string, string> = new Map([['/workspace/config.yml', 'stages:\n  - bad\n']]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/.gitlab-ci.yml', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await gitlabCiStagesStandard.check(badCtx);
    expect(results.length).toBe(0);
  });

  it('skips files without stages array', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab-ci.yml', 'build:\n  script: echo\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await gitlabCiStagesStandard.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/cli-tools-help-version', () => {
  it('has correct rule metadata', () => {
    expect(cliToolsHelpVersion.id).toBe('workspace/cli-tools-help-version');
    expect(cliToolsHelpVersion.scope).toBe('workspace');
    expect(typeof cliToolsHelpVersion.check).toBe('function');
  });

  it('warns when CLI tool lacks --help', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/bin/my-tool.sh', '#!/bin/bash\necho "running"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('--help'))).toBe(true);
  });

  it('warns when CLI tool lacks --version', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/bin/my-tool.sh',
        '#!/bin/bash\nif [[ "$1" == "--help" ]]; then echo "usage"; fi\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('--version'))).toBe(true);
  });

  it('passes when CLI tool supports both flags', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/bin/my-tool.sh',
        '#!/bin/bash\n# --help and --version supported\nversion="1.0"\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips non-bin/scripts files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/tool.sh', '#!/bin/bash\necho "no help"\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await cliToolsHelpVersion.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips files that cannot be read', async () => {
    const ctx: WorkspaceContext = mockContext({
      files: new Map([['/workspace/bin/tool.sh', '']]),
    });
    const badCtx: WorkspaceContext = {
      ...ctx,
      readFile: async (): Promise<string> => {
        await Promise.resolve();
        throw new Error('ENOENT');
      },
    };
    const results: LintResult[] = await cliToolsHelpVersion.check(badCtx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/workspace-spelling', () => {
  it('has correct rule metadata', () => {
    expect(workspaceSpelling.id).toBe('workspace/workspace-spelling');
    expect(workspaceSpelling.scope).toBe('workspace');
    expect(typeof workspaceSpelling.check).toBe('function');
  });

  it('warns when cspell finds errors', async () => {
    const { execSync } = await import('node:child_process');
    const err: Error & { stderr?: Buffer; stdout?: Buffer } = new Error('cspell failed');
    err.stderr = Buffer.from('misspelled word found');
    vi.mocked(execSync).mockImplementation(() => {
      throw err;
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await workspaceSpelling.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Spelling errors');
    vi.mocked(execSync).mockReset();
  });

  it('passes when cspell succeeds', async () => {
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue(Buffer.from('') as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await workspaceSpelling.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
  });
});

describe('workspace/mr-title-format', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTitleFormat.id).toBe('workspace/mr-title-format');
    expect(mrTitleFormat.scope).toBe('workspace');
    expect(typeof mrTitleFormat.check).toBe('function');
  });

  it('reports error for invalid MR title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'bad title format';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Conventional Commit');
    process.env = { ...originalEnv };
  });

  it('passes for valid conventional commit title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'feat(api): add streaming support';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for title without scope', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'fix: resolve memory leak';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is empty', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTitleFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-description-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDescriptionRequired.id).toBe('workspace/mr-description-required');
    expect(mrDescriptionRequired.scope).toBe('workspace');
    expect(typeof mrDescriptionRequired.check).toBe('function');
  });

  it('reports error when description is empty', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no description');
    process.env = { ...originalEnv };
  });

  it('reports error when description is "null"', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = 'null';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes when description is present', async () => {
    process.env['CI_MERGE_REQUEST_DESCRIPTION'] = 'Adds metrics exporter for Prometheus';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_DESCRIPTION is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_DESCRIPTION'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-label-enforcement', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelEnforcement.id).toBe('workspace/mr-label-enforcement');
    expect(mrLabelEnforcement.scope).toBe('workspace');
    expect(typeof mrLabelEnforcement.check).toBe('function');
  });

  it('reports error when no approved label is present', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'random-label,misc';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing required domain');
    process.env = { ...originalEnv };
  });

  it('passes when an approved label is present', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'api,random-label';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes with multiple approved labels', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'frontend,backend,tests';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_LABELS is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelEnforcement.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-target-branch-protected', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTargetBranchProtected.id).toBe('workspace/mr-target-branch-protected');
    expect(mrTargetBranchProtected.scope).toBe('workspace');
    expect(typeof mrTargetBranchProtected.check).toBe('function');
  });

  it('reports error when targeting main', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'main';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('main');
    process.env = { ...originalEnv };
  });

  it('reports error when targeting production', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'production';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('production');
    process.env = { ...originalEnv };
  });

  it('reports error when targeting prod', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'prod';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for non-protected branch', async () => {
    process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'] = 'staging';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TARGET_BRANCH_NAME is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TARGET_BRANCH_NAME'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTargetBranchProtected.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-draft-block', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDraftBlock.id).toBe('workspace/mr-draft-block');
    expect(mrDraftBlock.scope).toBe('workspace');
    expect(typeof mrDraftBlock.check).toBe('function');
  });

  it('reports error for draft title with uppercase Draft:', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'Draft: work in progress';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Draft');
    process.env = { ...originalEnv };
  });

  it('reports error for draft title with lowercase draft:', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'draft: still working';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for non-draft title', async () => {
    process.env['CI_MERGE_REQUEST_TITLE'] = 'feat: add new feature';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_TITLE is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDraftBlock.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-conflicting-labels', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrConflictingLabels.id).toBe('workspace/mr-conflicting-labels');
    expect(mrConflictingLabels.scope).toBe('workspace');
    expect(typeof mrConflictingLabels.check).toBe('function');
  });

  it('reports error for hotfix+refactor conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'hotfix,refactor';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('hotfix');
    expect(results[0]!.message).toContain('refactor');
    process.env = { ...originalEnv };
  });

  it('reports error for breaking-change+patch conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'breaking-change,patch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('breaking-change');
    expect(results[0]!.message).toContain('patch');
    process.env = { ...originalEnv };
  });

  it('reports error for feature+remove conflict', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'feature,remove';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports multiple errors for multiple conflicts', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'hotfix,refactor,feature,remove';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes with non-conflicting labels', async () => {
    process.env['CI_MERGE_REQUEST_LABELS'] = 'feature,api,frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_MERGE_REQUEST_LABELS is not set', async () => {
    delete process.env['CI_MERGE_REQUEST_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConflictingLabels.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-size-limit', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrSizeLimit.id).toBe('workspace/mr-size-limit');
    expect(mrSizeLimit.scope).toBe('workspace');
    expect(typeof mrSizeLimit.check).toBe('function');
  });

  it('warns when total lines exceed 800', async () => {
    process.env['MR_LINES_ADDED'] = '500';
    process.env['MR_LINES_REMOVED'] = '400';
    delete process.env['MR_FILES_CHANGED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('900');
    process.env = { ...originalEnv };
  });

  it('warns when files exceed 20', async () => {
    delete process.env['MR_LINES_ADDED'];
    delete process.env['MR_LINES_REMOVED'];
    process.env['MR_FILES_CHANGED'] = '25';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('25');
    process.env = { ...originalEnv };
  });

  it('warns on both lines and files exceeding limits', async () => {
    process.env['MR_LINES_ADDED'] = '600';
    process.env['MR_LINES_REMOVED'] = '300';
    process.env['MR_FILES_CHANGED'] = '30';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes when under limits', async () => {
    process.env['MR_LINES_ADDED'] = '100';
    process.env['MR_LINES_REMOVED'] = '50';
    process.env['MR_FILES_CHANGED'] = '5';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes at exact boundary (800 lines, 20 files)', async () => {
    process.env['MR_LINES_ADDED'] = '400';
    process.env['MR_LINES_REMOVED'] = '400';
    process.env['MR_FILES_CHANGED'] = '20';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when no size env vars are set', async () => {
    delete process.env['MR_LINES_ADDED'];
    delete process.env['MR_LINES_REMOVED'];
    delete process.env['MR_FILES_CHANGED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSizeLimit.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-assignee-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrAssigneeRequired.id).toBe('workspace/mr-assignee-required');
    expect(mrAssigneeRequired.scope).toBe('workspace');
    expect(typeof mrAssigneeRequired.check).toBe('function');
  });

  it('reports error when assignee is empty', async () => {
    process.env['MR_ASSIGNEE'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('no assignee');
    process.env = { ...originalEnv };
  });

  it('passes when assignee is set', async () => {
    process.env['MR_ASSIGNEE'] = 'john.doe';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_ASSIGNEE is not set', async () => {
    delete process.env['MR_ASSIGNEE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAssigneeRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-reviewer-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrReviewerRequired.id).toBe('workspace/mr-reviewer-required');
    expect(mrReviewerRequired.scope).toBe('workspace');
    expect(typeof mrReviewerRequired.check).toBe('function');
  });

  it('reports error when reviewers is empty', async () => {
    process.env['MR_REVIEWERS'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('missing reviewers');
    process.env = { ...originalEnv };
  });

  it('passes when reviewers are set', async () => {
    process.env['MR_REVIEWERS'] = 'alice,bob';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_REVIEWERS is not set', async () => {
    delete process.env['MR_REVIEWERS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReviewerRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-blocking-discussions', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrBlockingDiscussions.id).toBe('workspace/mr-blocking-discussions');
    expect(mrBlockingDiscussions.scope).toBe('workspace');
    expect(typeof mrBlockingDiscussions.check).toBe('function');
  });

  it('reports error when unresolved discussions exist', async () => {
    process.env['MR_BLOCKING_DISCUSSIONS_COUNT'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('3');
    process.env = { ...originalEnv };
  });

  it('passes when count is zero', async () => {
    process.env['MR_BLOCKING_DISCUSSIONS_COUNT'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_BLOCKING_DISCUSSIONS_COUNT is not set', async () => {
    delete process.env['MR_BLOCKING_DISCUSSIONS_COUNT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBlockingDiscussions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-wip-commit-check', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrWipCommitCheck.id).toBe('workspace/mr-wip-commit-check');
    expect(mrWipCommitCheck.scope).toBe('workspace');
    expect(typeof mrWipCommitCheck.check).toBe('function');
  });

  it('reports error for wip commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 wip stuff';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('WIP');
    process.env = { ...originalEnv };
  });

  it('reports error for tmp commit message', async () => {
    process.env['MR_COMMITS'] = 'def5678 tmp save';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for debug commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 debug logging added';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for fixme commit message', async () => {
    process.env['MR_COMMITS'] = 'abc1234 fixme later';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for clean commit messages', async () => {
    process.env['MR_COMMITS'] = 'abc1234 feat: add new feature\ndef5678 fix: resolve bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS is not set', async () => {
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrWipCommitCheck.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-approval-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrApprovalRequired.id).toBe('workspace/mr-approval-required');
    expect(mrApprovalRequired.scope).toBe('workspace');
    expect(typeof mrApprovalRequired.check).toBe('function');
  });

  it('reports error when approvals are insufficient (default min=1)', async () => {
    process.env['MR_APPROVAL_COUNT'] = '0';
    delete process.env['MR_APPROVAL_MIN_REQUIRED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('0');
    expect(results[0]!.message).toContain('1');
    process.env = { ...originalEnv };
  });

  it('reports error when approvals below custom minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '1';
    process.env['MR_APPROVAL_MIN_REQUIRED'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('3');
    process.env = { ...originalEnv };
  });

  it('passes when approvals meet default minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '1';
    delete process.env['MR_APPROVAL_MIN_REQUIRED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when approvals exceed custom minimum', async () => {
    process.env['MR_APPROVAL_COUNT'] = '5';
    process.env['MR_APPROVAL_MIN_REQUIRED'] = '3';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_APPROVAL_COUNT is not set', async () => {
    delete process.env['MR_APPROVAL_COUNT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrApprovalRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-branch-source-rules', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrBranchSourceRules.id).toBe('workspace/mr-branch-source-rules');
    expect(mrBranchSourceRules.scope).toBe('workspace');
    expect(typeof mrBranchSourceRules.check).toBe('function');
  });

  it('reports error for invalid branch name', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'my-random-branch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('my-random-branch');
    process.env = { ...originalEnv };
  });

  it('reports error for branch missing slash', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for valid feature branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/add-auth';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid fix branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'fix/memory-leak';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid chore branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'chore/update-deps';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for valid hotfix branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'hotfix/critical-fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH is not set', async () => {
    delete process.env['MR_SOURCE_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrBranchSourceRules.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-codeowners-approval', () => {
  it('has correct rule metadata', () => {
    expect(mrCodeownersApproval.id).toBe('workspace/mr-codeowners-approval');
    expect(mrCodeownersApproval.scope).toBe('workspace');
    expect(typeof mrCodeownersApproval.check).toBe('function');
  });

  it('reports error when CODEOWNERS file is missing', async () => {
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace', files: new Map() });
    const results: LintResult[] = await mrCodeownersApproval.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('CODEOWNERS');
  });

  it('passes when CODEOWNERS file exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.gitlab/CODEOWNERS', '* @team-lead\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace', files });
    const results: LintResult[] = await mrCodeownersApproval.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/mr-labels-required-per-scope', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelsRequiredPerScope.id).toBe('workspace/mr-labels-required-per-scope');
    expect(mrLabelsRequiredPerScope.scope).toBe('workspace');
    expect(typeof mrLabelsRequiredPerScope.check).toBe('function');
  });

  it('reports error when api label is missing for api path', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts';
    process.env['MR_LABELS'] = 'frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('api');
    process.env = { ...originalEnv };
  });

  it('reports error when ci label is missing for .gitlab path', async () => {
    process.env['MODIFIED_PATHS'] = '.gitlab/ci.yml';
    process.env['MR_LABELS'] = 'frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('ci');
    process.env = { ...originalEnv };
  });

  it('passes when correct labels are present', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts packages/docs/README.md';
    process.env['MR_LABELS'] = 'api,docs';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MODIFIED_PATHS is not set', async () => {
    delete process.env['MODIFIED_PATHS'];
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/src/index.ts';
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelsRequiredPerScope.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-dependency-changes-reviewed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrDependencyChangesReviewed.id).toBe('workspace/mr-dependency-changes-reviewed');
    expect(mrDependencyChangesReviewed.scope).toBe('workspace');
    expect(typeof mrDependencyChangesReviewed.check).toBe('function');
  });

  it('reports error when package.json changed without deps-reviewed label', async () => {
    process.env['MODIFIED_PATHS'] = 'packages/api/package.json';
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('package.json');
    process.env = { ...originalEnv };
  });

  it('reports error when pnpm-lock.yaml changed without deps-reviewed label', async () => {
    process.env['MODIFIED_PATHS'] = 'pnpm-lock.yaml';
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('pnpm-lock.yaml');
    process.env = { ...originalEnv };
  });

  it('passes when deps-reviewed label is present', async () => {
    process.env['MODIFIED_PATHS'] = 'package.json pnpm-lock.yaml';
    process.env['MR_LABELS'] = 'api,deps-reviewed';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no dependency files are modified', async () => {
    process.env['MODIFIED_PATHS'] = 'src/index.ts README.md';
    process.env['MR_LABELS'] = 'api';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MODIFIED_PATHS is not set', async () => {
    delete process.env['MODIFIED_PATHS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrDependencyChangesReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-ci-pipeline-passed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrCiPipelinePassed.id).toBe('workspace/mr-ci-pipeline-passed');
    expect(mrCiPipelinePassed.scope).toBe('workspace');
    expect(typeof mrCiPipelinePassed.check).toBe('function');
  });

  it('reports error when pipeline status is failed', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'failed';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('failed');
    process.env = { ...originalEnv };
  });

  it('reports error when pipeline status is running', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'running';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('running');
    process.env = { ...originalEnv };
  });

  it('passes when pipeline status is success', async () => {
    process.env['CI_PIPELINE_STATUS'] = 'success';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when CI_PIPELINE_STATUS is not set', async () => {
    delete process.env['CI_PIPELINE_STATUS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCiPipelinePassed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-up-to-date-with-target', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrUpToDateWithTarget.id).toBe('workspace/mr-up-to-date-with-target');
    expect(mrUpToDateWithTarget.scope).toBe('workspace');
    expect(typeof mrUpToDateWithTarget.check).toBe('function');
  });

  it('reports error when source branch is behind target', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    process.env['MR_SOURCE_BRANCH'] = 'feature/foo';
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not ancestor');
    });
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('behind');
    vi.mocked(execSync).mockReset();
    process.env = { ...originalEnv };
  });

  it('passes when source branch is up to date', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    process.env['MR_SOURCE_BRANCH'] = 'feature/bar';
    const { execSync } = await import('node:child_process');
    vi.mocked(execSync).mockReturnValue('' as never);
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    vi.mocked(execSync).mockReset();
    process.env = { ...originalEnv };
  });

  it('skips when MR_TARGET_BRANCH is not set', async () => {
    delete process.env['MR_TARGET_BRANCH'];
    process.env['MR_SOURCE_BRANCH'] = 'feature/foo';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH is not set', async () => {
    process.env['MR_TARGET_BRANCH'] = 'main';
    delete process.env['MR_SOURCE_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrUpToDateWithTarget.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-cherry-pick-label', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrCherryPickLabel.id).toBe('workspace/mr-cherry-pick-label');
    expect(mrCherryPickLabel.scope).toBe('workspace');
    expect(typeof mrCherryPickLabel.check).toBe('function');
  });

  it('reports error for cherry-pick title without label', async () => {
    process.env['MR_TITLE'] = 'fix(ui): cherry-pick bug fix';
    process.env['MR_LABELS'] = 'fix,ui';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Cherry-pick');
    process.env = { ...originalEnv };
  });

  it('reports error for backport title without label', async () => {
    process.env['MR_TITLE'] = 'fix: backport critical patch';
    process.env['MR_LABELS'] = 'fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for cherry-pick title with cherry-pick label', async () => {
    process.env['MR_TITLE'] = 'fix(ui): cherry-pick bug fix';
    process.env['MR_LABELS'] = 'cherry-pick,fix';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for backport title with backport label', async () => {
    process.env['MR_TITLE'] = 'fix: backport critical patch';
    process.env['MR_LABELS'] = 'backport';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-cherry-pick title', async () => {
    process.env['MR_TITLE'] = 'feat: add new feature';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TITLE is not set', async () => {
    delete process.env['MR_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrCherryPickLabel.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-test-coverage-diff', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTestCoverageDiff.id).toBe('workspace/mr-test-coverage-diff');
    expect(mrTestCoverageDiff.scope).toBe('workspace');
    expect(typeof mrTestCoverageDiff.check).toBe('function');
  });

  it('warns when coverage decreased', async () => {
    process.env['COVERAGE_BEFORE'] = '91.3';
    process.env['COVERAGE_AFTER'] = '89.6';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('decreased');
    process.env = { ...originalEnv };
  });

  it('passes when coverage increased', async () => {
    process.env['COVERAGE_BEFORE'] = '89.0';
    process.env['COVERAGE_AFTER'] = '91.5';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when coverage unchanged', async () => {
    process.env['COVERAGE_BEFORE'] = '90.0';
    process.env['COVERAGE_AFTER'] = '90.0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when env vars not set', async () => {
    delete process.env['COVERAGE_BEFORE'];
    delete process.env['COVERAGE_AFTER'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestCoverageDiff.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-label-format', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelFormat.id).toBe('workspace/mr-label-format');
    expect(mrLabelFormat.scope).toBe('workspace');
    expect(typeof mrLabelFormat.check).toBe('function');
  });

  it('reports error for uppercase label', async () => {
    process.env['MR_LABELS'] = 'FixesBug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('FixesBug');
    process.env = { ...originalEnv };
  });

  it('reports error for label with spaces', async () => {
    process.env['MR_LABELS'] = 'needs review';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for valid kebab-case labels', async () => {
    process.env['MR_LABELS'] = 'api-change,no-changelog,frontend';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelFormat.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-release-label-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrReleaseLabelRequired.id).toBe('workspace/mr-release-label-required');
    expect(mrReleaseLabelRequired.scope).toBe('workspace');
    expect(typeof mrReleaseLabelRequired.check).toBe('function');
  });

  it('reports error when targeting release branch without label', async () => {
    process.env['MR_TARGET_BRANCH'] = 'release/1.5.0';
    process.env['MR_LABELS'] = 'changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('release');
    process.env = { ...originalEnv };
  });

  it('passes when targeting release branch with label', async () => {
    process.env['MR_TARGET_BRANCH'] = 'release/1.5.0';
    process.env['MR_LABELS'] = 'release,changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-release branch', async () => {
    process.env['MR_TARGET_BRANCH'] = 'staging';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TARGET_BRANCH is not set', async () => {
    delete process.env['MR_TARGET_BRANCH'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrReleaseLabelRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-no-force-push-after-review', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrNoForcePushAfterReview.id).toBe('workspace/mr-no-force-push-after-review');
    expect(mrNoForcePushAfterReview.scope).toBe('workspace');
    expect(typeof mrNoForcePushAfterReview.check).toBe('function');
  });

  it('reports error when force-push after approval', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T10:30:00Z';
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Force-push');
    process.env = { ...originalEnv };
  });

  it('passes when force-push before approval', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T06:00:00Z';
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_FORCE_PUSHED_AT is not set', async () => {
    delete process.env['MR_FORCE_PUSHED_AT'];
    process.env['MR_APPROVED_AT'] = '2025-06-13T08:15:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_APPROVED_AT is not set', async () => {
    process.env['MR_FORCE_PUSHED_AT'] = '2025-06-13T10:30:00Z';
    delete process.env['MR_APPROVED_AT'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrNoForcePushAfterReview.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-license-change-reviewed', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLicenseChangeReviewed.id).toBe('workspace/mr-license-change-reviewed');
    expect(mrLicenseChangeReviewed.scope).toBe('workspace');
    expect(typeof mrLicenseChangeReviewed.check).toBe('function');
  });

  it('reports error for LICENSE change without label', async () => {
    process.env['MR_CHANGED_FILES'] = 'LICENSE\nREADME.md';
    process.env['MR_LABELS'] = 'changelog';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('legal-approved');
    process.env = { ...originalEnv };
  });

  it('passes for LICENSE change with legal-approved label', async () => {
    process.env['MR_CHANGED_FILES'] = 'LICENSE';
    process.env['MR_LABELS'] = 'legal-approved';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no license files changed', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/index.ts\nREADME.md';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLicenseChangeReviewed.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-config-changes-approved', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrConfigChangesApproved.id).toBe('workspace/mr-config-changes-approved');
    expect(mrConfigChangesApproved.scope).toBe('workspace');
    expect(typeof mrConfigChangesApproved.check).toBe('function');
  });

  it('reports error for config change without label', async () => {
    process.env['MR_CHANGED_FILES'] = '.env.production\nsrc/index.ts';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('config-approved');
    process.env = { ...originalEnv };
  });

  it('reports error for wrangler.json change without label', async () => {
    process.env['MR_CHANGED_FILES'] = 'wrangler.json';
    process.env['MR_LABELS'] = 'infra';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(1);
    process.env = { ...originalEnv };
  });

  it('passes with config-approved label', async () => {
    process.env['MR_CHANGED_FILES'] = '.env\ntsconfig.json';
    process.env['MR_LABELS'] = 'config-approved';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when no config files changed', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/index.ts';
    process.env['MR_LABELS'] = 'feat';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrConfigChangesApproved.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-open-too-long', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrOpenTooLong.id).toBe('workspace/mr-open-too-long');
    expect(mrOpenTooLong.scope).toBe('workspace');
    expect(typeof mrOpenTooLong.check).toBe('function');
  });

  it('warns when MR open >= 10 days', async () => {
    process.env['MR_OPENED_AT'] = '2025-06-01T12:00:00Z';
    process.env['NOW_UTC'] = '2025-06-13T12:00:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('12');
    process.env = { ...originalEnv };
  });

  it('passes when MR open < 10 days', async () => {
    process.env['MR_OPENED_AT'] = '2025-06-10T12:00:00Z';
    process.env['NOW_UTC'] = '2025-06-13T12:00:00Z';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when env vars not set', async () => {
    delete process.env['MR_OPENED_AT'];
    delete process.env['NOW_UTC'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrOpenTooLong.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-automerge-not-enabled-by-default', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrAutomergeNotEnabledByDefault.id).toBe('workspace/mr-automerge-not-enabled-by-default');
    expect(mrAutomergeNotEnabledByDefault.scope).toBe('workspace');
    expect(typeof mrAutomergeNotEnabledByDefault.check).toBe('function');
  });

  it('reports error when automerge enabled without pipeline success', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'running';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('pipeline');
    process.env = { ...originalEnv };
  });

  it('reports error when automerge enabled without approval', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'success';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('approval');
    process.env = { ...originalEnv };
  });

  it('passes when automerge enabled with success + approval', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '1';
    process.env['MR_PIPELINE_STATUS'] = 'success';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes when automerge not enabled', async () => {
    process.env['MR_AUTOMERGE_ENABLED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_AUTOMERGE_ENABLED is not set', async () => {
    delete process.env['MR_AUTOMERGE_ENABLED'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrAutomergeNotEnabledByDefault.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-label-conflict-matrix', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrLabelConflictMatrix.id).toBe('workspace/mr-label-conflict-matrix');
    expect(mrLabelConflictMatrix.scope).toBe('workspace');
    expect(typeof mrLabelConflictMatrix.check).toBe('function');
  });

  it('reports error for breaking-change+patch conflict', async () => {
    process.env['MR_LABELS'] = 'breaking-change,patch';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('breaking-change');
    process.env = { ...originalEnv };
  });

  it('reports error for hotfix+chore conflict', async () => {
    process.env['MR_LABELS'] = 'hotfix,chore';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('reports error for feature+revert conflict', async () => {
    process.env['MR_LABELS'] = 'feature,revert';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes with non-conflicting labels', async () => {
    process.env['MR_LABELS'] = 'feature,api,docs';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_LABELS is not set', async () => {
    delete process.env['MR_LABELS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrLabelConflictMatrix.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-sensitive-path-changes', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrSensitivePathChanges.id).toBe('workspace/mr-sensitive-path-changes');
    expect(mrSensitivePathChanges.scope).toBe('workspace');
    expect(typeof mrSensitivePathChanges.check).toBe('function');
  });

  it('reports error for sensitive path without approval', async () => {
    process.env['MR_CHANGED_FILES'] = 'scripts/deploy.sh\nsrc/index.ts';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('sensitive');
    process.env = { ...originalEnv };
  });

  it('reports error for .env file without approval', async () => {
    process.env['MR_CHANGED_FILES'] = '.env.production';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(1);
    process.env = { ...originalEnv };
  });

  it('passes for sensitive path with approval', async () => {
    process.env['MR_CHANGED_FILES'] = '.gitlab/ci.yml';
    process.env['MR_APPROVED'] = '1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for non-sensitive paths', async () => {
    process.env['MR_CHANGED_FILES'] = 'src/utils.ts\nREADME.md';
    process.env['MR_APPROVED'] = '0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_CHANGED_FILES is not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrSensitivePathChanges.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/mr-test-or-benchmark-regressions', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(mrTestOrBenchmarkRegressions.id).toBe('workspace/mr-test-or-benchmark-regressions');
    expect(mrTestOrBenchmarkRegressions.scope).toBe('workspace');
    expect(typeof mrTestOrBenchmarkRegressions.check).toBe('function');
  });

  it('reports error for coverage regression > 0.5%', async () => {
    process.env['MR_COVERAGE_DIFF'] = '-2.3';
    delete process.env['MR_BENCHMARK_DIFF'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('coverage');
    process.env = { ...originalEnv };
  });

  it('reports error for benchmark regression > 5%', async () => {
    delete process.env['MR_COVERAGE_DIFF'];
    process.env['MR_BENCHMARK_DIFF'] = '8.1';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('enchmark');
    process.env = { ...originalEnv };
  });

  it('passes when within limits', async () => {
    process.env['MR_COVERAGE_DIFF'] = '-0.3';
    process.env['MR_BENCHMARK_DIFF'] = '2.0';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when both env vars not set', async () => {
    delete process.env['MR_COVERAGE_DIFF'];
    delete process.env['MR_BENCHMARK_DIFF'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await mrTestOrBenchmarkRegressions.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/valibot-consistency', () => {
  it('has correct rule metadata', () => {
    expect(valibotConsistency.id).toBe('workspace/valibot-consistency');
    expect(valibotConsistency.scope).toBe('workspace');
    expect(typeof valibotConsistency.check).toBe('function');
  });

  it('warns on unused Valibot schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/schemas.ts', 'const UserSchema = v.object({ name: v.string() });\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r: LintResult): boolean => r.message.includes('never validated'))).toBe(
      true,
    );
  });

  it('passes for used Valibot schema', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/schemas.ts',
        'const UserSchema = v.object({ name: v.string() });\nUserSchema.safeParse(data);\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    const unused: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes('never validated'),
    );
    expect(unused.length).toBe(0);
  });

  it('warns on raw JSON.parse usage', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.ts', 'const data = JSON.parse(raw);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('JSON.parse'))).toBe(true);
  });

  it('warns on inline anonymous v.object schema', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/handler.ts', 'const result = validate(v.object({ id: v.number() }));\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Inline anonymous'))).toBe(
      true,
    );
  });

  it('passes for clean .ts files with no issues', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/clean.ts', 'const x = 1;\nexport default x;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips test files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/parser.test.ts', 'const data = JSON.parse(raw);\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await valibotConsistency.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/vitest-config-and-coverage', () => {
  it('has correct rule metadata', () => {
    expect(vitestConfigAndCoverage.id).toBe('workspace/vitest-config-and-coverage');
    expect(vitestConfigAndCoverage.scope).toBe('workspace');
    expect(typeof vitestConfigAndCoverage.check).toBe('function');
  });

  it('reports error when no shared vitest config exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export default 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Missing shared vitest.config')),
    ).toBe(true);
  });

  it('passes when shared vitest config exists', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/test/vitest.config.ts', 'export default {};\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    const missing: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes('Missing shared vitest.config'),
    );
    expect(missing.length).toBe(0);
  });

  it('reports error for rogue vitest config', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/test/vitest.config.ts', 'export default {};\n'],
      ['/workspace/packages/api/vitest.config.ts', 'export default {};\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('Unexpected Vitest config')),
    ).toBe(true);
  });

  it('reports error for .snap files', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/__snapshots__/test.snap', 'snapshot content'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Snapshot file'))).toBe(
      true,
    );
  });

  it('reports error for skipped test', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/src/math.test.ts',
        'describe("math", () => {\n  it.skip("adds", () => {});\n});\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndCoverage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Skipped or focused'))).toBe(
      true,
    );
  });
});

describe('workspace/vitest-config-and-usage', () => {
  it('has correct rule metadata', () => {
    expect(vitestConfigAndUsage.id).toBe('workspace/vitest-config-and-usage');
    expect(vitestConfigAndUsage.scope).toBe('workspace');
    expect(typeof vitestConfigAndUsage.check).toBe('function');
  });

  it('reports error when vitest config missing defineConfig', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/vitest.config.ts', 'export default { test: {} };\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('defineConfig'))).toBe(true);
  });

  it('reports error when vitest config missing isolate', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: {} });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('isolate'))).toBe(true);
  });

  it('reports error when vitest config missing coverage', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { isolate: true } });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.some((r: LintResult): boolean => r.message.includes('Missing coverage'))).toBe(
      true,
    );
  });

  it('passes for proper vitest config', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/vitest.config.ts',
        'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { isolate: true, coverage: { lines: 90 } } });\n',
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    const issues: LintResult[] = results.filter(
      (r: LintResult): boolean =>
        r.message.includes('defineConfig') ||
        r.message.includes('isolate') ||
        r.message.includes('coverage'),
    );
    expect(issues.length).toBe(0);
  });

  it('reports error for shared vitest export', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/utils/index.ts', "export { describe } from 'vitest';\n"],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(
      results.some((r: LintResult): boolean => r.message.includes('exporting test-only')),
    ).toBe(true);
  });

  it('passes when no vitest configs exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/src/index.ts', 'export default 1;\n'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await vitestConfigAndUsage.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('workspace/pr-svg-optimized', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prSvgOptimized.id).toBe('workspace/pr-svg-optimized');
    expect(prSvgOptimized.scope).toBe('workspace');
    expect(typeof prSvgOptimized.check).toBe('function');
  });

  it('warns on SVG with xmlns:xlink', async () => {
    const files: Map<string, string> = new Map([
      [
        'icon.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><rect/></svg>',
      ],
    ]);
    process.env['MR_CHANGED_FILES'] = 'icon.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('not optimized');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with metadata element', async () => {
    const files: Map<string, string> = new Map([
      ['logo.svg', '<svg><metadata><rdf/></metadata><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'logo.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with inkscape attributes', async () => {
    const files: Map<string, string> = new Map([
      ['draw.svg', '<svg inkscape:version="1.0"><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'draw.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns on SVG with HTML comments', async () => {
    const files: Map<string, string> = new Map([
      ['commented.svg', '<svg><!-- generated by editor --><rect/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'commented.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('passes for clean optimized SVG', async () => {
    const files: Map<string, string> = new Map([
      ['clean.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'],
    ]);
    process.env['MR_CHANGED_FILES'] = 'clean.svg';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips non-SVG files in MR_CHANGED_FILES', async () => {
    const files: Map<string, string> = new Map([['index.ts', 'export default 1;\n']]);
    process.env['MR_CHANGED_FILES'] = 'index.ts';
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('scans all SVGs when MR_CHANGED_FILES not set', async () => {
    delete process.env['MR_CHANGED_FILES'];
    const files: Map<string, string> = new Map([
      ['/workspace/bad.svg', '<svg xmlns:xlink="x"><rect/></svg>'],
      ['/workspace/good.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.file).toContain('bad.svg');
    process.env = { ...originalEnv };
  });

  it('skips files that fail to read', async () => {
    process.env['MR_CHANGED_FILES'] = 'missing.svg';
    const ctx: WorkspaceContext = mockContext({ files: new Map() });
    const results: LintResult[] = await prSvgOptimized.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/pr-branch-commit-mismatch', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prBranchCommitMismatch.id).toBe('workspace/pr-branch-commit-mismatch');
    expect(prBranchCommitMismatch.scope).toBe('workspace');
    expect(typeof prBranchCommitMismatch.check).toBe('function');
  });

  it('reports error when commit does not match branch prefix', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/add-login';
    process.env['MR_COMMITS'] = 'fix: some unrelated change';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('feature');
    process.env = { ...originalEnv };
  });

  it('passes when commit matches branch prefix', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'fix/login-bug';
    process.env['MR_COMMITS'] = 'fix: resolve login crash';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes with parenthetical prefix format', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feat/new-dashboard';
    process.env['MR_COMMITS'] = 'feat(dashboard): add charts';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips for main branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'main';
    process.env['MR_COMMITS'] = 'chore: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips for master branch', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'master';
    process.env['MR_COMMITS'] = 'chore: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_SOURCE_BRANCH not set', async () => {
    delete process.env['MR_SOURCE_BRANCH'];
    process.env['MR_COMMITS'] = 'fix: something';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS not set', async () => {
    process.env['MR_SOURCE_BRANCH'] = 'feature/x';
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prBranchCommitMismatch.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/pr-description-required', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prDescriptionRequired.id).toBe('workspace/pr-description-required');
    expect(prDescriptionRequired.scope).toBe('workspace');
    expect(typeof prDescriptionRequired.check).toBe('function');
  });

  it('reports error for empty description', async () => {
    process.env['MR_DESCRIPTION'] = '';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('too short');
    process.env = { ...originalEnv };
  });

  it('reports error for short description', async () => {
    process.env['MR_DESCRIPTION'] = 'Fix bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('too short');
    process.env = { ...originalEnv };
  });

  it('reports error for whitespace-only description', async () => {
    process.env['MR_DESCRIPTION'] = '         ';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    process.env = { ...originalEnv };
  });

  it('passes for adequate description', async () => {
    process.env['MR_DESCRIPTION'] =
      'This PR fixes the login timeout bug by extending the session duration.';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for exactly 10 chars', async () => {
    process.env['MR_DESCRIPTION'] = '1234567890';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_DESCRIPTION not set', async () => {
    delete process.env['MR_DESCRIPTION'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prDescriptionRequired.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/pr-no-merge-commits', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prNoMergeCommits.id).toBe('workspace/pr-no-merge-commits');
    expect(prNoMergeCommits.scope).toBe('workspace');
    expect(typeof prNoMergeCommits.check).toBe('function');
  });

  it('reports error for merge branch commit', async () => {
    process.env['MR_COMMITS'] = "Merge branch 'main' into feature/x";
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Merge commit detected');
    process.env = { ...originalEnv };
  });

  it('reports error for merge remote-tracking commit', async () => {
    process.env['MR_COMMITS'] = 'Merge remote-tracking branch origin/main';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('Merge commit detected');
    process.env = { ...originalEnv };
  });

  it('reports multiple merge commits', async () => {
    process.env['MR_COMMITS'] =
      "Merge branch 'main' into feature\nMerge branch 'develop' into feature";
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(2);
    process.env = { ...originalEnv };
  });

  it('passes for clean commits', async () => {
    process.env['MR_COMMITS'] = 'feat: add new dashboard\nfix: resolve login bug';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for commits with merge in message body but not at start', async () => {
    process.env['MR_COMMITS'] = 'fix: merge resolution for conflict';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_COMMITS not set', async () => {
    delete process.env['MR_COMMITS'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prNoMergeCommits.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('workspace/pr-wip-warning', () => {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  it('has correct rule metadata', () => {
    expect(prWipWarning.id).toBe('workspace/pr-wip-warning');
    expect(prWipWarning.scope).toBe('workspace');
    expect(typeof prWipWarning.check).toBe('function');
  });

  it('warns for title with [WIP]', async () => {
    process.env['MR_TITLE'] = '[WIP] feat: new dashboard';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('Work in Progress');
    process.env = { ...originalEnv };
  });

  it('warns for title with [wip] lowercase', async () => {
    process.env['MR_TITLE'] = '[wip] fix: login';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('warns for title with [Wip] mixed case', async () => {
    process.env['MR_TITLE'] = '[Wip] chore: cleanup';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.severity).toBe('warning');
    process.env = { ...originalEnv };
  });

  it('passes for normal title without WIP', async () => {
    process.env['MR_TITLE'] = 'feat: add dashboard charts';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('passes for title containing WIP without brackets', async () => {
    process.env['MR_TITLE'] = 'feat: improve WIP detection';
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });

  it('skips when MR_TITLE not set', async () => {
    delete process.env['MR_TITLE'];
    const ctx: WorkspaceContext = mockContext({ rootDir: '/workspace' });
    const results: LintResult[] = await prWipWarning.check(ctx);
    expect(results.length).toBe(0);
    process.env = { ...originalEnv };
  });
});

describe('sync/turbo-tasks', () => {
  it('has correct rule metadata', () => {
    expect(syncTurboTasks.id).toBe('sync/turbo-tasks');
    expect(syncTurboTasks.scope).toBe('workspace');
    expect(typeof syncTurboTasks.check).toBe('function');
  });

  it('passes when all turbo task references are valid', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            build: 'turbo build',
            test: 'turbo qa:test',
            ci: 'turbo qa:checks qa:test -- --verbose',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            build: {},
            'qa:test': {},
            'qa:checks': {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when a turbo task reference does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            ci: 'turbo nonexistent-task',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            build: {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/turbo-tasks');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-task');
  });

  it('handles //#  root-task prefix correctly', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            format: 'turbo //#qa:format',
          },
        }),
      ],
      [
        '/workspace/turbo.json',
        JSON.stringify({
          tasks: {
            '//#qa:format': {},
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/turbo.json', JSON.stringify({ tasks: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when turbo.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { ci: 'turbo build' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });

  it('passes when no scripts reference turbo', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: { start: 'node index.js' } })],
      ['/workspace/turbo.json', JSON.stringify({ tasks: { build: {} } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTurboTasks.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/tsconfig-paths', () => {
  it('has correct rule metadata', () => {
    expect(syncTsconfigPaths.id).toBe('sync/tsconfig-paths');
    expect(syncTsconfigPaths.scope).toBe('workspace');
    expect(typeof syncTsconfigPaths.check).toBe('function');
  });

  it('passes when all path alias targets exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/utils': ['./packages/utils/src/index.ts'],
            },
          },
        }),
      ],
      ['/workspace/packages/utils/src/index.ts', 'export {}'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when a path alias target does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/missing': ['./packages/missing/src/index.ts'],
            },
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({
      files,
      rootDir: '/workspace',
    });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/tsconfig-paths');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('@/missing');
  });

  it('skips wildcard targets', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/tsconfig.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@/utils/*': ['./packages/utils/src/*'],
            },
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when tsconfig.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncTsconfigPaths.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/lefthook-scripts', () => {
  it('has correct rule metadata', () => {
    expect(syncLefthookScripts.id).toBe('sync/lefthook-scripts');
    expect(syncLefthookScripts.scope).toBe('workspace');
    expect(typeof syncLefthookScripts.check).toBe('function');
  });

  it('passes when all lefthook pnpm scripts exist in package.json', async () => {
    const lefthookContent: string = [
      'commit-msg:',
      '  commands:',
      '    validate:',
      '      run: pnpm run lint:commit --edit {1}',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/lefthook.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'lint:commit': 'commitlint' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when lefthook references a missing pnpm script', async () => {
    const lefthookContent: string = [
      'commit-msg:',
      '  commands:',
      '    validate:',
      '      run: pnpm lint:commit --edit {1}',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/lefthook.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/lefthook-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('lint:commit');
  });

  it('returns empty when no lefthook config found', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('checks alternate lefthook config paths', async () => {
    const lefthookContent: string = [
      'pre-push:',
      '  commands:',
      '    test:',
      '      run: pnpm qa:test',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/packages/shared/config/lefthook/base.yml', lefthookContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'qa:test': 'vitest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncLefthookScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/onboarding-steps', () => {
  it('has correct rule metadata', () => {
    expect(syncOnboardingSteps.id).toBe('sync/onboarding-steps');
    expect(syncOnboardingSteps.scope).toBe('workspace');
    expect(typeof syncOnboardingSteps.check).toBe('function');
  });

  it('passes when all onboarding steps are valid scripts', async () => {
    const configContent: string = [
      'export default {',
      '  tooling: {',
      '    onboarding: {',
      "      steps: ['i', 'setup:vscode'],",
      '    },',
      '  },',
      '};',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/resist.config.ts', configContent],
      [
        '/workspace/package.json',
        JSON.stringify({ scripts: { i: 'pnpm install', 'setup:vscode': 'echo setup' } }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when an onboarding step is not a valid script', async () => {
    const configContent: string = [
      'export default {',
      '  tooling: {',
      '    onboarding: {',
      "      steps: ['i', 'nonexistent-step'],",
      '    },',
      '  },',
      '};',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/resist.config.ts', configContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { i: 'pnpm install' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/onboarding-steps');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-step');
  });

  it('returns empty when no resist config found', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const configContent: string = "export default { tooling: { onboarding: { steps: ['i'] } } };";
    const files: Map<string, string> = new Map([['/workspace/resist.config.ts', configContent]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncOnboardingSteps.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/workflow-scripts', () => {
  it('has correct rule metadata', () => {
    expect(syncWorkflowScripts.id).toBe('sync/workflow-scripts');
    expect(syncWorkflowScripts.scope).toBe('workspace');
    expect(typeof syncWorkflowScripts.check).toBe('function');
  });

  it('passes when all workflow pnpm scripts are valid', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: pnpm install',
      '      - run: pnpm qa:test',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: { 'qa:test': 'vitest' } })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when workflow references missing pnpm script', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: pnpm nonexistent-script',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/workflow-scripts');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('nonexistent-script');
  });

  it('skips pnpm built-in commands', async () => {
    const workflowContent: string = [
      'name: CI',
      'on: push',
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: pnpm install',
      '      - run: pnpm dlx turbo build',
      '      - run: pnpm exec vitest',
    ].join('\n');
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', workflowContent],
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no workflow files exist', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/package.json', JSON.stringify({ scripts: {} })],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map([
      ['/workspace/.github/workflows/ci.yml', 'name: CI\non: push'],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncWorkflowScripts.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/filter-patterns', () => {
  it('has correct rule metadata', () => {
    expect(syncFilterPatterns.id).toBe('sync/filter-patterns');
    expect(syncFilterPatterns.scope).toBe('workspace');
    expect(typeof syncFilterPatterns.check).toBe('function');
  });

  it('passes when filter paths exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            'dev:admin': 'turbo dev --filter=packages/tools/admin --',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('errors when filter path does not exist', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            'dev:admin': 'turbo dev --filter=packages/tools/nonexistent --',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/filter-patterns');
    expect(results[0]!.severity).toBe('error');
    expect(results[0]!.message).toContain('packages/tools/nonexistent');
  });

  it('skips glob filter patterns', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            all: 'turbo build --filter=packages/*',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('skips package name selectors', async () => {
    const files: Map<string, string> = new Map([
      [
        '/workspace/package.json',
        JSON.stringify({
          scripts: {
            test: 'turbo test --filter=@my/package',
          },
        }),
      ],
    ]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when package.json is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncFilterPatterns.check(ctx);
    expect(results.length).toBe(0);
  });
});

describe('sync/pnpm-workspace', () => {
  it('has correct rule metadata', () => {
    expect(syncPnpmWorkspace.id).toBe('sync/pnpm-workspace');
    expect(syncPnpmWorkspace.scope).toBe('workspace');
    expect(typeof syncPnpmWorkspace.check).toBe('function');
  });

  it('passes when all workspace patterns match directories', async () => {
    const workspaceYaml: string = "packages:\n  - 'packages/**'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('warns when glob base directory does not exist', async () => {
    const workspaceYaml: string = "packages:\n  - 'nonexistent/**'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/pnpm-workspace');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('nonexistent');
  });

  it('warns when non-glob pattern directory does not exist', async () => {
    const workspaceYaml: string = "packages:\n  - 'tools/missing'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    vi.spyOn(ctx, 'dirExists').mockResolvedValue(false);
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('sync/pnpm-workspace');
    expect(results[0]!.severity).toBe('warning');
    expect(results[0]!.message).toContain('tools/missing');
  });

  it('returns empty when pnpm-workspace.yaml is missing', async () => {
    const files: Map<string, string> = new Map();
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });

  it('returns empty when no patterns in workspace file', async () => {
    const workspaceYaml: string = "catalogs:\n  default:\n    valibot: '^1.0.0'\n";
    const files: Map<string, string> = new Map([['/workspace/pnpm-workspace.yaml', workspaceYaml]]);
    const ctx: WorkspaceContext = mockContext({ files });
    const results: LintResult[] = await syncPnpmWorkspace.check(ctx);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// Bulk inputs() smoke-coverage
// =============================================================================
const BULK_INPUTS_RULES_4: ReadonlyArray<{
  id: string;
  rule: { inputs?: (ctx: unknown) => Promise<readonly string[]> };
}> = [
  { id: 'svg-no-embedded-font', rule: svgNoEmbeddedFont },
  { id: 'svg-no-script', rule: svgNoScript },
  { id: 'svg-no-external-url', rule: svgNoExternalUrl },
  { id: 'svg-no-raster-image', rule: svgNoRasterImage },
  { id: 'svg-no-external-font-url', rule: svgNoExternalFontUrl },
  { id: 'svg-no-text-element', rule: svgNoTextElement },
  { id: 'svg-no-xlink-http', rule: svgNoXlinkHttp },
  { id: 'svg-requires-namespace', rule: svgRequiresNamespace },
  { id: 'svg-no-event-handler', rule: svgNoEventHandler },
  { id: 'svg-no-remote-href', rule: svgNoRemoteHref },
  { id: 'svg-no-embedded-media', rule: svgNoEmbeddedMedia },
  { id: 'svg-no-hidden-interactive', rule: svgNoHiddenInteractive },
  { id: 'svg-symbol-requires-viewbox', rule: svgSymbolRequiresViewbox },
  { id: 'svg-opacity-requires-fill', rule: svgOpacityRequiresFill },
  { id: 'svg-no-blur-filter', rule: svgNoBlurFilter },
  { id: 'svg-ids-unique', rule: svgIdsUnique },
  { id: 'svg-requires-aria-role', rule: svgRequiresAriaRole },
  { id: 'svg-no-clipped-text', rule: svgNoClippedText },
  { id: 'svg-title-first-child', rule: svgTitleFirstChild },
  { id: 'svg-no-tabindex', rule: svgNoTabindex },
  { id: 'svg-no-mask-fragment', rule: svgNoMaskFragment },
  { id: 'svg-requires-aria-attrs', rule: svgRequiresAriaAttrs },
  { id: 'svg-title-desc-requires-lang', rule: svgTitleDescRequiresLang },
  { id: 'no-webp-icons', rule: noWebpIcons },
  { id: 'no-inline-svg-in-source', rule: noInlineSvgInSource },
  { id: 'no-webp-in-css', rule: noWebpInCss },
  { id: 'no-raw-svg-in-components', rule: noRawSvgInComponents },
  { id: 'webp-max-size', rule: webpMaxSize },
  { id: 'webp-no-lossless', rule: webpNoLossless },
  { id: 'webp-no-metadata', rule: webpNoMetadata },
  { id: 'ico-min-resolution', rule: icoMinResolution },
  { id: 'no-misleading-image-extension', rule: noMisleadingImageExtension },
  { id: 'svg-valid-xml', rule: svgValidXml },
  { id: 'ico-requires-multiresolution', rule: icoRequiresMultiresolution },
  { id: 'ico-optimal-palette', rule: icoOptimalPalette },
  { id: 'webp-no-color-profile', rule: webpNoColorProfile },
  { id: 'webp-yuv420-required', rule: webpYuv420Required },
  { id: 'gitlab-ci-file-required', rule: gitlabCiFileRequired },
  { id: 'gitlab-ci-schema-header', rule: gitlabCiSchemaHeader },
  { id: 'gitlab-ci-yaml-syntax', rule: gitlabCiYamlSyntax },
  { id: 'gitlab-ci-stages-declared', rule: gitlabCiStagesDeclared },
  { id: 'gitlab-ci-includes-valid', rule: gitlabCiIncludesValid },
  { id: 'shell-function-docblocks', rule: shellFunctionDocblocks },
  { id: 'gitlab-ci-jobs-have-script', rule: gitlabCiJobsHaveScript },
  { id: 'gitlab-ci-standard-naming', rule: gitlabCiStandardNaming },
  { id: 'wrangler-authenticated', rule: wranglerAuthenticated },
  { id: 'gitlab-ci-stages-standard', rule: gitlabCiStagesStandard },
  { id: 'cli-tools-help-version', rule: cliToolsHelpVersion },
  { id: 'workspace-spelling', rule: workspaceSpelling },
  { id: 'valibot-consistency', rule: valibotConsistency },
  { id: 'vitest-config-and-coverage', rule: vitestConfigAndCoverage },
  { id: 'vitest-config-and-usage', rule: vitestConfigAndUsage },
  { id: 'sync-turbo-tasks', rule: syncTurboTasks },
  { id: 'sync-tsconfig-paths', rule: syncTsconfigPaths },
  { id: 'sync-lefthook-scripts', rule: syncLefthookScripts },
  { id: 'sync-onboarding-steps', rule: syncOnboardingSteps },
  { id: 'sync-workflow-scripts', rule: syncWorkflowScripts },
  { id: 'sync-filter-patterns', rule: syncFilterPatterns },
  { id: 'sync-pnpm-workspace', rule: syncPnpmWorkspace },
];

describe('workspace-rules-4 — bulk inputs() smoke-coverage', () => {
  for (const { id, rule } of BULK_INPUTS_RULES_4) {
    it(`workspace/${id}.inputs() runs without throwing`, async () => {
      if (typeof rule.inputs !== 'function') {
        return;
      }

      const ctx: WorkspaceContext = mockContext({
        rootDir: '/workspace',
        files: new Map([
          ['/workspace/foo.ts', 'export const a = 1;'],
          ['/workspace/.gitlab-ci.yml', 'stages:\n  - test\n'],
          ['/workspace/icon.svg', '<svg/>'],
          ['/workspace/img.webp', 'WEBP'],
          ['/workspace/icon.ico', 'ICO'],
          ['/workspace/wrangler.toml', 'name = "x"\n'],
        ]),
        packages: [
          {
            name: '@/a',
            path: '/workspace/packages/a/package.json',
            dir: '/workspace/packages/a',
            packageJson: { name: '@/a' },
          },
        ],
      });
      const inputs = await rule.inputs!(ctx);
      expect(Array.isArray(inputs)).toBe(true);
    });
  }
});
