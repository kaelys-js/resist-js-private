/**
 * Provider Detection
 *
 * Data-driven CI/hosting provider detection from environment variables.
 * Covers ~71 known providers from std-env (unjs) and ci-info (watson).
 *
 * Detection iterates the provider list; first match wins (ordered
 * most-specific first). ALL `checks` must pass for a provider to match.
 * PR detection is per-provider using `matchValues`/`excludeValues`.
 *
 * All type annotations use Valibot-inferred types from `@/schemas/common`.
 *
 * @module
 */

import {
  ProviderInfoSchema,
  type Bool,
  type EnvRecordWithUndefined,
  type ProviderDefinition,
  type ProviderEnvCheck,
  type ProviderInfo,
  type Str,
} from '@/schemas/common';
import { ok, okUnchecked, type Result } from '@/schemas/result/result';

// =============================================================================
// Provider Definitions (~71 entries)
// =============================================================================

/**
 * Known CI/hosting provider definitions.
 *
 * Ordered most-specific first (providers with multiple checks before
 * single-check providers). CI providers first, cloud/hosting second.
 *
 * Sources:
 * - std-env v4.0.0-rc.1 (unjs)
 * - ci-info v4.4.0 (watson)
 */
const PROVIDERS: readonly ProviderDefinition[] = Object.freeze([
  // ─── CI Providers (isCI: true) ─── 55 entries

  // Multi-check providers first (more specific)
  {
    name: 'Jenkins',
    id: 'jenkins',
    isCI: true,
    checks: [{ key: 'JENKINS_URL' }, { key: 'BUILD_ID' }],
    pr: { key: 'CHANGE_ID' },
  },
  {
    name: 'TaskCluster',
    id: 'taskcluster',
    isCI: true,
    checks: [{ key: 'TASK_ID' }, { key: 'RUN_ID' }],
  },

  // Single-check CI providers (alphabetical)
  { name: 'Agola CI', id: 'agola', isCI: true, checks: [{ key: 'AGOLA_GIT_REF' }] },
  { name: 'Alpic', id: 'alpic', isCI: true, checks: [{ key: 'ALPIC_HOST' }] },
  { name: 'Appcircle', id: 'appcircle', isCI: true, checks: [{ key: 'AC_APPCIRCLE' }] },
  {
    name: 'AppVeyor',
    id: 'appveyor',
    isCI: true,
    checks: [{ key: 'APPVEYOR' }],
    pr: { key: 'APPVEYOR_PULL_REQUEST_NUMBER' },
  },
  {
    name: 'AWS CodeBuild',
    id: 'aws_codebuild',
    isCI: true,
    checks: [{ key: 'CODEBUILD_BUILD_ARN' }],
  },
  {
    name: 'Azure Pipelines',
    id: 'azure_pipelines',
    isCI: true,
    checks: [{ key: 'SYSTEM_TEAMFOUNDATIONCOLLECTIONURI' }],
    pr: { key: 'BUILD_REASON', matchValues: ['PullRequest'] },
  },
  { name: 'Bamboo', id: 'bamboo', isCI: true, checks: [{ key: 'bamboo_planKey' }] },
  {
    name: 'Bitbucket Pipelines',
    id: 'bitbucket',
    isCI: true,
    checks: [{ key: 'BITBUCKET_COMMIT' }],
    pr: { key: 'BITBUCKET_PR_ID' },
  },
  {
    name: 'Bitrise',
    id: 'bitrise',
    isCI: true,
    checks: [{ key: 'BITRISE_IO' }],
    pr: { key: 'BITRISE_PULL_REQUEST' },
  },
  {
    name: 'Buddy',
    id: 'buddy',
    isCI: true,
    checks: [{ key: 'BUDDY_WORKSPACE_ID' }],
    pr: { key: 'BUDDY_EXECUTION_PULL_REQUEST_ID' },
  },
  {
    name: 'Buildkite',
    id: 'buildkite',
    isCI: true,
    checks: [{ key: 'BUILDKITE' }],
    pr: { key: 'BUILDKITE_PULL_REQUEST', excludeValues: ['false'] },
  },
  {
    name: 'CircleCI',
    id: 'circleci',
    isCI: true,
    checks: [{ key: 'CIRCLECI' }],
    pr: { key: 'CIRCLE_PULL_REQUEST' },
  },
  {
    name: 'Cirrus CI',
    id: 'cirrus',
    isCI: true,
    checks: [{ key: 'CIRRUS_CI' }],
    pr: { key: 'CIRRUS_PR' },
  },
  { name: 'Cloudflare Pages', id: 'cloudflare_pages', isCI: true, checks: [{ key: 'CF_PAGES' }] },
  {
    name: 'Cloudflare Workers',
    id: 'cloudflare_workers',
    isCI: true,
    checks: [{ key: 'WORKERS_CI' }],
  },
  {
    name: 'Codefresh',
    id: 'codefresh',
    isCI: true,
    checks: [{ key: 'CF_BUILD_ID' }],
    pr: { key: 'CF_PULL_REQUEST_ID' },
  },
  { name: 'Codemagic', id: 'codemagic', isCI: true, checks: [{ key: 'CM_BUILD_ID' }] },
  {
    name: 'Codeship',
    id: 'codeship',
    isCI: true,
    checks: [{ key: 'CI_NAME', value: 'codeship' }],
    pr: { key: 'CI_PULL_REQUEST' },
  },
  {
    name: 'Drone',
    id: 'drone',
    isCI: true,
    checks: [{ key: 'DRONE' }],
    pr: { key: 'DRONE_PULL_REQUEST' },
  },
  { name: 'dsari', id: 'dsari', isCI: true, checks: [{ key: 'DSARI' }] },
  { name: 'Earthly', id: 'earthly', isCI: true, checks: [{ key: 'EARTHLY_CI' }] },
  { name: 'EAS Build', id: 'eas', isCI: true, checks: [{ key: 'EAS_BUILD' }] },
  { name: 'Gerrit', id: 'gerrit', isCI: true, checks: [{ key: 'GERRIT_PROJECT' }] },
  { name: 'Gitea Actions', id: 'gitea_actions', isCI: true, checks: [{ key: 'GITEA_ACTIONS' }] },
  {
    name: 'GitHub Actions',
    id: 'github_actions',
    isCI: true,
    checks: [{ key: 'GITHUB_ACTIONS' }],
    pr: { key: 'GITHUB_EVENT_NAME', matchValues: ['pull_request', 'pull_request_target'] },
  },
  {
    name: 'GitLab CI',
    id: 'gitlab',
    isCI: true,
    checks: [{ key: 'GITLAB_CI' }],
    pr: { key: 'CI_MERGE_REQUEST_ID' },
  },
  { name: 'GoCD', id: 'gocd', isCI: true, checks: [{ key: 'GO_PIPELINE_LABEL' }] },
  {
    name: 'Google Cloud Build',
    id: 'google_cloud_build',
    isCI: true,
    checks: [{ key: 'BUILDER_OUTPUT' }],
  },
  { name: 'Harness CI', id: 'harness', isCI: true, checks: [{ key: 'HARNESS_BUILD_ID' }] },
  { name: 'Heroku', id: 'heroku', isCI: true, checks: [{ key: 'HEROKU_TEST_RUN_ID' }] },
  { name: 'Hudson', id: 'hudson', isCI: true, checks: [{ key: 'HUDSON_URL' }] },
  {
    name: 'LayerCI',
    id: 'layerci',
    isCI: true,
    checks: [{ key: 'LAYERCI' }],
    pr: { key: 'LAYERCI_PULL_REQUEST' },
  },
  { name: 'Magnum CI', id: 'magnum', isCI: true, checks: [{ key: 'MAGNUM' }] },
  { name: 'Netlify', id: 'netlify', isCI: true, checks: [{ key: 'NETLIFY' }] },
  {
    name: 'Nevercode',
    id: 'nevercode',
    isCI: true,
    checks: [{ key: 'NEVERCODE' }],
    pr: { key: 'NEVERCODE_PULL_REQUEST', excludeValues: ['false'] },
  },
  { name: 'Prow', id: 'prow', isCI: true, checks: [{ key: 'PROW_JOB_ID' }] },
  { name: 'ReleaseHub', id: 'releasehub', isCI: true, checks: [{ key: 'RELEASE_BUILD_ID' }] },
  {
    name: 'Render',
    id: 'render',
    isCI: true,
    checks: [{ key: 'RENDER' }],
    pr: { key: 'IS_PULL_REQUEST' },
  },
  {
    name: 'Sail CI',
    id: 'sail',
    isCI: true,
    checks: [{ key: 'SAILCI' }],
    pr: { key: 'SAIL_PULL_REQUEST_NUMBER' },
  },
  {
    name: 'Screwdriver',
    id: 'screwdriver',
    isCI: true,
    checks: [{ key: 'SCREWDRIVER' }],
    pr: { key: 'SD_PULL_REQUEST' },
  },
  {
    name: 'Semaphore',
    id: 'semaphore',
    isCI: true,
    checks: [{ key: 'SEMAPHORE' }],
    pr: { key: 'PULL_REQUEST_NUMBER' },
  },
  {
    name: 'Shippable',
    id: 'shippable',
    isCI: true,
    checks: [{ key: 'SHIPPABLE' }],
    pr: { key: 'IS_PULL_REQUEST' },
  },
  { name: 'Solano', id: 'solano', isCI: true, checks: [{ key: 'TDDIUM' }] },
  {
    name: 'Sourcehut',
    id: 'sourcehut',
    isCI: true,
    checks: [{ key: 'CI_NAME', value: 'builds.sr.ht' }],
  },
  { name: 'Strider CD', id: 'strider', isCI: true, checks: [{ key: 'STRIDER' }] },
  { name: 'TeamCity', id: 'teamcity', isCI: true, checks: [{ key: 'TEAMCITY_VERSION' }] },
  {
    name: 'Travis CI',
    id: 'travis',
    isCI: true,
    checks: [{ key: 'TRAVIS' }],
    pr: { key: 'TRAVIS_PULL_REQUEST', excludeValues: ['false'] },
  },
  {
    name: 'Vela',
    id: 'vela',
    isCI: true,
    checks: [{ key: 'VELA' }],
    pr: { key: 'VELA_PULL_REQUEST' },
  },
  {
    name: 'Vercel',
    id: 'vercel',
    isCI: true,
    checks: [{ key: 'VERCEL' }],
    pr: { key: 'VERCEL_GIT_PULL_REQUEST_ID' },
  },
  { name: 'VS App Center', id: 'appcenter', isCI: true, checks: [{ key: 'APPCENTER_BUILD_ID' }] },
  {
    name: 'Woodpecker',
    id: 'woodpecker',
    isCI: true,
    checks: [{ key: 'WOODPECKER' }],
    pr: { key: 'CI_BUILD_EVENT', matchValues: ['pull_request'] },
  },
  { name: 'Xcode Cloud', id: 'xcode_cloud', isCI: true, checks: [{ key: 'CI_XCODE_PROJECT' }] },
  { name: 'Xcode Server', id: 'xcode_server', isCI: true, checks: [{ key: 'XCS' }] },

  // ─── Cloud/Hosting (isCI: false) ─── 16 entries

  { name: 'AWS Amplify', id: 'aws_amplify', isCI: false, checks: [{ key: 'AWS_APP_ID' }] },
  {
    name: 'AWS Lambda',
    id: 'aws_lambda',
    isCI: false,
    checks: [{ key: 'AWS_LAMBDA_FUNCTION_NAME' }],
  },
  {
    name: 'Azure Static Web Apps',
    id: 'azure_static',
    isCI: false,
    checks: [{ key: 'INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN' }],
  },
  { name: 'Cleavr', id: 'cleavr', isCI: false, checks: [{ key: 'CLEAVR' }] },
  { name: 'CodeSandbox', id: 'codesandbox', isCI: false, checks: [{ key: 'CODESANDBOX_SSE' }] },
  { name: 'Codesphere', id: 'codesphere', isCI: false, checks: [{ key: 'CODESPHERE_APP_ID' }] },
  { name: 'Deno Deploy', id: 'deno_deploy', isCI: false, checks: [{ key: 'DENO_DEPLOYMENT_ID' }] },
  {
    name: 'Firebase App Hosting',
    id: 'firebase_app_hosting',
    isCI: false,
    checks: [{ key: 'FIREBASE_APP_HOSTING' }],
  },
  { name: 'Fly.io', id: 'fly_io', isCI: false, checks: [{ key: 'FLY_ALLOC_ID' }] },
  { name: 'Gitpod', id: 'gitpod', isCI: false, checks: [{ key: 'GITPOD_WORKSPACE_ID' }] },
  { name: 'Google Cloud Run', id: 'google_cloudrun', isCI: false, checks: [{ key: 'K_SERVICE' }] },
  {
    name: 'Google Cloud Run Job',
    id: 'google_cloudrun_job',
    isCI: false,
    checks: [{ key: 'CLOUD_RUN_JOB' }],
  },
  { name: 'Railway', id: 'railway', isCI: false, checks: [{ key: 'RAILWAY_PROJECT_ID' }] },
  { name: 'StackBlitz', id: 'stackblitz', isCI: false, checks: [{ key: 'STACKBLITZ' }] },
  { name: 'Stormkit', id: 'stormkit', isCI: false, checks: [{ key: 'STORMKIT' }] },
  { name: 'Zeabur', id: 'zeabur', isCI: false, checks: [{ key: 'ZEABUR' }] },
]) as readonly ProviderDefinition[];

// =============================================================================
// Detection
// =============================================================================

/**
 * Detects the current CI/hosting provider from environment variables.
 *
 * Iterates ~71 known provider definitions. For each, ALL `checks` must
 * pass (env key exists, or key equals specific value). First match wins.
 *
 * @param {EnvRecordWithUndefined} env - Environment variable record (from `getEnvRecord()`).
 * @returns {Result<ProviderInfo | undefined>} `Result<ProviderInfo | undefined>` — detected provider, or `undefined` if none matched.
 *
 * @example
 * ```typescript
 * const envResult: Result<EnvRecordWithUndefined> = getEnvRecord();
 * if (!envResult.ok) return envResult;
 * const providerResult: Result<ProviderInfo | undefined> = detectProvider(envResult.data);
 * if (!providerResult.ok) return providerResult;
 * if (providerResult.data) {
 *   providerResult.data.id; // e.g., 'github_actions'
 * }
 * ```
 */
export function detectProvider(env: EnvRecordWithUndefined): Result<ProviderInfo | undefined> {
  for (const provider of PROVIDERS) {
    const allMatch: Bool = provider.checks.every((check: ProviderEnvCheck): Bool => {
      const val: Str | undefined = env[check.key];
      if (val === undefined) {
        return false;
      }
      if (check.value !== undefined) {
        return val === check.value;
      }
      if (check.includes !== undefined) {
        return val.includes(check.includes);
      }
      return true;
    });
    if (!allMatch) {
      continue;
    }

    // PR detection
    let isPR: Bool | null = null;
    if (provider.pr !== undefined) {
      const prVal: Str | undefined = env[provider.pr.key];
      if (prVal === undefined || prVal === '') {
        isPR = false;
      } else if (provider.pr.excludeValues !== undefined) {
        isPR = !provider.pr.excludeValues.includes(prVal);
      } else if (provider.pr.matchValues === undefined) {
        isPR = true;
      } else {
        isPR = provider.pr.matchValues.includes(prVal);
      }
    }

    return ok(ProviderInfoSchema, {
      name: provider.name,
      id: provider.id,
      isCI: provider.isCI,
      isPR,
    });
  }

  return okUnchecked<ProviderInfo | undefined>(undefined);
}
