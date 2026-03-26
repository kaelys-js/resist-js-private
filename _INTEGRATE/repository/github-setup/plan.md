# GitHub Setup Plan

> Automated GitHub organization, repository, and permissions configuration via Pulumi

## Overview

Fully automated GitHub setup using Pulumi TypeScript provider. Configures organization settings, repositories, branch protection, teams, secrets, labels, and more.

## Architecture

```
config/github.ts (source of truth)
        │
        ▼
┌───────────────────┐
│  Pulumi GitHub    │
│    Provider       │
└────────┬──────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│                 GitHub                           │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │Organization │  │   Teams     │              │
│  │  Settings   │  │             │              │
│  └─────────────┘  └─────────────┘              │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │            Repositories                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │ resist  │  │  docs   │  │ infra   │ │   │
│  │  │  .js    │  │         │  │         │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘ │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │  Secrets    │  │   Actions   │              │
│  │             │  │  Workflows  │              │
│  └─────────────┘  └─────────────┘              │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Part 1: Configuration

### GitHub Config Schema

```typescript
// config/github.ts
import * as v from 'valibot';

export const GitHubConfigSchema = v.object({
  organization: v.object({
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    email: v.string(),
    location: v.optional(v.string()),
    blog: v.optional(v.string()),
    twitterUsername: v.optional(v.string()),
    billingEmail: v.string(),
    defaultRepositoryPermission: v.picklist(['read', 'write', 'admin', 'none']),
    membersCanCreateRepositories: v.boolean(),
    membersCanCreatePublicRepositories: v.boolean(),
    membersCanCreatePrivateRepositories: v.boolean(),
    membersCanForkPrivateRepositories: v.boolean(),
    webCommitSignoffRequired: v.boolean(),
    dependabotAlertsEnabled: v.boolean(),
    dependabotSecurityUpdatesEnabled: v.boolean(),
    dependencyGraphEnabled: v.boolean(),
    secretScanningEnabled: v.boolean(),
    secretScanningPushProtectionEnabled: v.boolean(),
  }),

  teams: v.array(v.object({
    name: v.string(),
    description: v.string(),
    privacy: v.picklist(['secret', 'closed']),
    permission: v.picklist(['pull', 'triage', 'push', 'maintain', 'admin']),
    members: v.array(v.string()),
    maintainers: v.array(v.string()),
  })),

  repositories: v.array(v.object({
    name: v.string(),
    description: v.string(),
    visibility: v.picklist(['public', 'private', 'internal']),
    hasIssues: v.boolean(),
    hasProjects: v.boolean(),
    hasWiki: v.boolean(),
    hasDiscussions: v.boolean(),
    allowMergeCommit: v.boolean(),
    allowSquashMerge: v.boolean(),
    allowRebaseMerge: v.boolean(),
    allowAutoMerge: v.boolean(),
    deleteBranchOnMerge: v.boolean(),
    squashMergeCommitTitle: v.picklist(['PR_TITLE', 'COMMIT_OR_PR_TITLE']),
    squashMergeCommitMessage: v.picklist(['PR_BODY', 'COMMIT_MESSAGES', 'BLANK']),
    topics: v.array(v.string()),
    homepage: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
    branchProtection: v.optional(v.object({
      branch: v.string(),
      enforceAdmins: v.boolean(),
      requiredReviews: v.optional(v.object({
        requiredApprovingReviewCount: v.number(),
        dismissStaleReviews: v.boolean(),
        requireCodeOwnerReviews: v.boolean(),
        restrictDismissals: v.boolean(),
      })),
      requiredStatusChecks: v.optional(v.object({
        strict: v.boolean(),
        contexts: v.array(v.string()),
      })),
      requireConversationResolution: v.boolean(),
      requireSignedCommits: v.boolean(),
      allowForcePushes: v.boolean(),
      allowDeletions: v.boolean(),
    })),
    teamAccess: v.optional(v.array(v.object({
      team: v.string(),
      permission: v.picklist(['pull', 'triage', 'push', 'maintain', 'admin']),
    }))),
  })),

  labels: v.array(v.object({
    name: v.string(),
    color: v.string(),
    description: v.string(),
  })),

  environments: v.array(v.object({
    name: v.string(),
    waitTimer: v.optional(v.number()),
    reviewers: v.optional(v.array(v.object({
      type: v.picklist(['User', 'Team']),
      id: v.string(),
    }))),
    deploymentBranchPolicy: v.optional(v.object({
      protectedBranches: v.boolean(),
      customBranchPolicies: v.boolean(),
    })),
  })),
});

export type GitHubConfig = v.InferOutput<typeof GitHubConfigSchema>;
```

### Actual Configuration

```typescript
// config/github.config.ts
import type { GitHubConfig } from './github';

export const GITHUB_CONFIG: GitHubConfig = {
  organization: {
    name: 'resist-js',
    displayName: 'resist.js',
    description: 'Multi-product SaaS monorepo',
    email: 'hello@resist.dev',
    blog: 'https://resist.dev',
    twitterUsername: 'resistjs',
    billingEmail: 'billing@resist.dev',
    defaultRepositoryPermission: 'read',
    membersCanCreateRepositories: false,
    membersCanCreatePublicRepositories: false,
    membersCanCreatePrivateRepositories: false,
    membersCanForkPrivateRepositories: false,
    webCommitSignoffRequired: false,
    dependabotAlertsEnabled: true,
    dependabotSecurityUpdatesEnabled: true,
    dependencyGraphEnabled: true,
    secretScanningEnabled: true,
    secretScanningPushProtectionEnabled: true,
  },

  teams: [
    {
      name: 'core',
      description: 'Core team with full access',
      privacy: 'closed',
      permission: 'admin',
      members: [],
      maintainers: ['founder-username'],
    },
    {
      name: 'engineering',
      description: 'Engineering team',
      privacy: 'closed',
      permission: 'push',
      members: [],
      maintainers: ['lead-engineer'],
    },
    {
      name: 'design',
      description: 'Design team',
      privacy: 'closed',
      permission: 'push',
      members: [],
      maintainers: [],
    },
    {
      name: 'contractors',
      description: 'External contractors',
      privacy: 'secret',
      permission: 'triage',
      members: [],
      maintainers: [],
    },
  ],

  repositories: [
    {
      name: 'resist.js',
      description: 'Multi-product SaaS monorepo',
      visibility: 'private',
      hasIssues: true,
      hasProjects: true,
      hasWiki: false,
      hasDiscussions: true,
      allowMergeCommit: false,
      allowSquashMerge: true,
      allowRebaseMerge: false,
      allowAutoMerge: true,
      deleteBranchOnMerge: true,
      squashMergeCommitTitle: 'PR_TITLE',
      squashMergeCommitMessage: 'PR_BODY',
      topics: ['saas', 'monorepo', 'svelte', 'cloudflare', 'typescript'],
      branchProtection: {
        branch: 'main',
        enforceAdmins: false,
        requiredReviews: {
          requiredApprovingReviewCount: 1,
          dismissStaleReviews: true,
          requireCodeOwnerReviews: true,
          restrictDismissals: false,
        },
        requiredStatusChecks: {
          strict: true,
          contexts: ['CI / Lint', 'CI / Test', 'CI / Build'],
        },
        requireConversationResolution: true,
        requireSignedCommits: false,
        allowForcePushes: false,
        allowDeletions: false,
      },
      teamAccess: [
        { team: 'core', permission: 'admin' },
        { team: 'engineering', permission: 'push' },
        { team: 'design', permission: 'push' },
        { team: 'contractors', permission: 'triage' },
      ],
    },
    {
      name: 'certificates',
      description: 'iOS/Android code signing certificates (Fastlane match)',
      visibility: 'private',
      hasIssues: false,
      hasProjects: false,
      hasWiki: false,
      hasDiscussions: false,
      allowMergeCommit: true,
      allowSquashMerge: true,
      allowRebaseMerge: true,
      allowAutoMerge: false,
      deleteBranchOnMerge: true,
      squashMergeCommitTitle: 'PR_TITLE',
      squashMergeCommitMessage: 'BLANK',
      topics: ['certificates', 'fastlane', 'match'],
      teamAccess: [
        { team: 'core', permission: 'admin' },
      ],
    },
  ],

  labels: [
    // Type
    { name: 'type: bug', color: 'd73a4a', description: 'Something isn\'t working' },
    { name: 'type: feature', color: 'a2eeef', description: 'New feature or request' },
    { name: 'type: enhancement', color: '84b6eb', description: 'Improvement to existing feature' },
    { name: 'type: docs', color: '0075ca', description: 'Documentation only changes' },
    { name: 'type: chore', color: 'fef2c0', description: 'Maintenance and chores' },
    { name: 'type: refactor', color: 'd4c5f9', description: 'Code refactoring' },
    { name: 'type: test', color: 'bfdadc', description: 'Tests only changes' },

    // Priority
    { name: 'priority: critical', color: 'b60205', description: 'Must be fixed ASAP' },
    { name: 'priority: high', color: 'd93f0b', description: 'High priority' },
    { name: 'priority: medium', color: 'fbca04', description: 'Medium priority' },
    { name: 'priority: low', color: '0e8a16', description: 'Low priority' },

    // Status
    { name: 'status: blocked', color: 'd73a4a', description: 'Blocked by something' },
    { name: 'status: in progress', color: 'fbca04', description: 'Currently being worked on' },
    { name: 'status: needs review', color: '0075ca', description: 'Needs code review' },
    { name: 'status: ready', color: '0e8a16', description: 'Ready for implementation' },

    // Product
    { name: 'product: tastier', color: 'ff6b6b', description: 'Tastier product' },
    { name: 'product: cherishall', color: '4ecdc4', description: 'Cherishall product' },
    { name: 'product: shared', color: '95a5a6', description: 'Shared packages' },

    // Area
    { name: 'area: api', color: '5319e7', description: 'API related' },
    { name: 'area: app', color: '1d76db', description: 'App related' },
    { name: 'area: marketing', color: 'c5def5', description: 'Marketing site related' },
    { name: 'area: infra', color: 'bfd4f2', description: 'Infrastructure related' },
    { name: 'area: ci/cd', color: 'e99695', description: 'CI/CD related' },
    { name: 'area: mobile', color: 'f9d0c4', description: 'Mobile (iOS/Android) related' },

    // Dependencies
    { name: 'dependencies', color: '0366d6', description: 'Dependency updates' },
    { name: 'security', color: 'd73a4a', description: 'Security related' },

    // Meta
    { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
    { name: 'help wanted', color: '008672', description: 'Extra attention is needed' },
    { name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
    { name: 'duplicate', color: 'cfd3d7', description: 'This issue or PR already exists' },
    { name: 'invalid', color: 'e4e669', description: 'This doesn\'t seem right' },

    // Reminders (for automated issues)
    { name: 'reminder', color: 'f9d0c4', description: 'Automated reminder' },
    { name: 'reminder: renewal', color: 'fef2c0', description: 'Renewal reminder' },
    { name: 'reminder: review', color: 'd4c5f9', description: 'Review reminder' },
  ],

  environments: [
    {
      name: 'staging',
      waitTimer: 0,
      deploymentBranchPolicy: {
        protectedBranches: true,
        customBranchPolicies: false,
      },
    },
    {
      name: 'production',
      waitTimer: 0,
      reviewers: [
        { type: 'Team', id: 'core' },
      ],
      deploymentBranchPolicy: {
        protectedBranches: true,
        customBranchPolicies: false,
      },
    },
  ],
};
```

---

## Part 2: Pulumi Implementation

### Provider Setup

```typescript
// packages/shared/iac/src/github/index.ts
import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';
import { GITHUB_CONFIG } from '@resist/config/github.config';

const config = new pulumi.Config();
const githubToken = config.requireSecret('githubToken');

// Provider
const githubProvider = new github.Provider('github', {
  token: githubToken,
  owner: GITHUB_CONFIG.organization.name,
});

export { githubProvider };
```

### Organization Settings

```typescript
// packages/shared/iac/src/github/organization.ts
import * as github from '@pulumi/github';
import { GITHUB_CONFIG } from '@resist/config/github.config';
import { githubProvider } from './index';

export function configureOrganization() {
  const org = GITHUB_CONFIG.organization;

  // Organization settings
  new github.OrganizationSettings('org-settings', {
    billingEmail: org.billingEmail,
    name: org.displayName,
    description: org.description,
    blog: org.blog,
    email: org.email,
    twitterUsername: org.twitterUsername,
    location: org.location,
    defaultRepositoryPermission: org.defaultRepositoryPermission,
    membersCanCreateRepositories: org.membersCanCreateRepositories,
    membersCanCreatePublicRepositories: org.membersCanCreatePublicRepositories,
    membersCanCreatePrivateRepositories: org.membersCanCreatePrivateRepositories,
    membersCanForkPrivateRepositories: org.membersCanForkPrivateRepositories,
    webCommitSignoffRequired: org.webCommitSignoffRequired,
    dependabotAlertsEnabledForNewRepositories: org.dependabotAlertsEnabled,
    dependabotSecurityUpdatesEnabledForNewRepositories: org.dependabotSecurityUpdatesEnabled,
    dependencyGraphEnabledForNewRepositories: org.dependencyGraphEnabled,
    secretScanningEnabledForNewRepositories: org.secretScanningEnabled,
    secretScanningPushProtectionEnabledForNewRepositories: org.secretScanningPushProtectionEnabled,
  }, { provider: githubProvider });
}
```

### Teams

```typescript
// packages/shared/iac/src/github/teams.ts
import * as github from '@pulumi/github';
import { GITHUB_CONFIG } from '@resist/config/github.config';
import { githubProvider } from './index';

export function createTeams() {
  const teams: Record<string, github.Team> = {};

  for (const teamConfig of GITHUB_CONFIG.teams) {
    const team = new github.Team(teamConfig.name, {
      name: teamConfig.name,
      description: teamConfig.description,
      privacy: teamConfig.privacy,
    }, { provider: githubProvider });

    teams[teamConfig.name] = team;

    // Add members
    for (const member of teamConfig.members) {
      new github.TeamMembership(`${teamConfig.name}-member-${member}`, {
        teamId: team.id,
        username: member,
        role: 'member',
      }, { provider: githubProvider });
    }

    // Add maintainers
    for (const maintainer of teamConfig.maintainers) {
      new github.TeamMembership(`${teamConfig.name}-maintainer-${maintainer}`, {
        teamId: team.id,
        username: maintainer,
        role: 'maintainer',
      }, { provider: githubProvider });
    }
  }

  return teams;
}
```

### Repositories

```typescript
// packages/shared/iac/src/github/repositories.ts
import * as github from '@pulumi/github';
import { GITHUB_CONFIG } from '@resist/config/github.config';
import { githubProvider } from './index';

export function createRepositories(teams: Record<string, github.Team>) {
  const repos: Record<string, github.Repository> = {};

  for (const repoConfig of GITHUB_CONFIG.repositories) {
    // Create repository
    const repo = new github.Repository(repoConfig.name, {
      name: repoConfig.name,
      description: repoConfig.description,
      visibility: repoConfig.visibility,
      hasIssues: repoConfig.hasIssues,
      hasProjects: repoConfig.hasProjects,
      hasWiki: repoConfig.hasWiki,
      hasDiscussions: repoConfig.hasDiscussions,
      allowMergeCommit: repoConfig.allowMergeCommit,
      allowSquashMerge: repoConfig.allowSquashMerge,
      allowRebaseMerge: repoConfig.allowRebaseMerge,
      allowAutoMerge: repoConfig.allowAutoMerge,
      deleteBranchOnMerge: repoConfig.deleteBranchOnMerge,
      squashMergeCommitTitle: repoConfig.squashMergeCommitTitle,
      squashMergeCommitMessage: repoConfig.squashMergeCommitMessage,
      topics: repoConfig.topics,
      homepageUrl: repoConfig.homepage,
      isTemplate: repoConfig.isTemplate,
      archived: repoConfig.archived,
      vulnerabilityAlerts: true,
      securityAndAnalysis: {
        secretScanning: { status: 'enabled' },
        secretScanningPushProtection: { status: 'enabled' },
      },
    }, { provider: githubProvider });

    repos[repoConfig.name] = repo;

    // Branch protection
    if (repoConfig.branchProtection) {
      const bp = repoConfig.branchProtection;

      new github.BranchProtection(`${repoConfig.name}-${bp.branch}-protection`, {
        repositoryId: repo.nodeId,
        pattern: bp.branch,
        enforceAdmins: bp.enforceAdmins,
        requiredPullRequestReviews: bp.requiredReviews ? [{
          requiredApprovingReviewCount: bp.requiredReviews.requiredApprovingReviewCount,
          dismissStaleReviews: bp.requiredReviews.dismissStaleReviews,
          requireCodeOwnerReviews: bp.requiredReviews.requireCodeOwnerReviews,
          restrictDismissals: bp.requiredReviews.restrictDismissals,
        }] : [],
        requiredStatusChecks: bp.requiredStatusChecks ? [{
          strict: bp.requiredStatusChecks.strict,
          contexts: bp.requiredStatusChecks.contexts,
        }] : [],
        requireConversationResolution: bp.requireConversationResolution,
        requireSignedCommits: bp.requireSignedCommits,
        allowsForcePushes: bp.allowForcePushes,
        allowsDeletions: bp.allowDeletions,
      }, { provider: githubProvider, dependsOn: [repo] });
    }

    // Team access
    if (repoConfig.teamAccess) {
      for (const access of repoConfig.teamAccess) {
        const team = teams[access.team];
        if (team) {
          new github.TeamRepository(`${repoConfig.name}-team-${access.team}`, {
            teamId: team.id,
            repository: repo.name,
            permission: access.permission,
          }, { provider: githubProvider });
        }
      }
    }
  }

  return repos;
}
```

### Labels

```typescript
// packages/shared/iac/src/github/labels.ts
import * as github from '@pulumi/github';
import { GITHUB_CONFIG } from '@resist/config/github.config';
import { githubProvider } from './index';

export function createLabels(repos: Record<string, github.Repository>) {
  // Create labels for each repository
  for (const [repoName, repo] of Object.entries(repos)) {
    for (const labelConfig of GITHUB_CONFIG.labels) {
      new github.IssueLabel(`${repoName}-label-${labelConfig.name}`, {
        repository: repo.name,
        name: labelConfig.name,
        color: labelConfig.color,
        description: labelConfig.description,
      }, { provider: githubProvider });
    }
  }
}
```

### Environments

```typescript
// packages/shared/iac/src/github/environments.ts
import * as github from '@pulumi/github';
import { GITHUB_CONFIG } from '@resist/config/github.config';
import { githubProvider } from './index';

export function createEnvironments(
  repos: Record<string, github.Repository>,
  teams: Record<string, github.Team>
) {
  // Create environments for main repo
  const mainRepo = repos['resist.js'];
  if (!mainRepo) return;

  for (const envConfig of GITHUB_CONFIG.environments) {
    const reviewers = envConfig.reviewers?.map(r => {
      if (r.type === 'Team') {
        return { teams: [teams[r.id]?.id].filter(Boolean) };
      }
      return { users: [r.id] };
    }) || [];

    new github.RepositoryEnvironment(`env-${envConfig.name}`, {
      repository: mainRepo.name,
      environment: envConfig.name,
      waitTimer: envConfig.waitTimer,
      reviewers: reviewers.length > 0 ? reviewers : undefined,
      deploymentBranchPolicy: envConfig.deploymentBranchPolicy ? {
        protectedBranches: envConfig.deploymentBranchPolicy.protectedBranches,
        customBranchPolicies: envConfig.deploymentBranchPolicy.customBranchPolicies,
      } : undefined,
    }, { provider: githubProvider });
  }
}
```

### Secrets

```typescript
// packages/shared/iac/src/github/secrets.ts
import * as github from '@pulumi/github';
import * as pulumi from '@pulumi/pulumi';
import { githubProvider } from './index';

interface SecretConfig {
  name: string;
  value: pulumi.Output<string> | string;
  environment?: string;
}

export function createSecrets(
  repo: github.Repository,
  secrets: SecretConfig[]
) {
  for (const secret of secrets) {
    if (secret.environment) {
      // Environment secret
      new github.ActionsEnvironmentSecret(`secret-${secret.environment}-${secret.name}`, {
        repository: repo.name,
        environment: secret.environment,
        secretName: secret.name,
        plaintextValue: secret.value,
      }, { provider: githubProvider });
    } else {
      // Repository secret
      new github.ActionsSecret(`secret-${secret.name}`, {
        repository: repo.name,
        secretName: secret.name,
        plaintextValue: secret.value,
      }, { provider: githubProvider });
    }
  }
}
```

### Main Entry Point

```typescript
// packages/shared/iac/src/github/main.ts
import * as pulumi from '@pulumi/pulumi';
import { configureOrganization } from './organization';
import { createTeams } from './teams';
import { createRepositories } from './repositories';
import { createLabels } from './labels';
import { createEnvironments } from './environments';
import { createSecrets } from './secrets';

export function setupGitHub() {
  // 1. Configure organization
  configureOrganization();

  // 2. Create teams
  const teams = createTeams();

  // 3. Create repositories
  const repos = createRepositories(teams);

  // 4. Create labels
  createLabels(repos);

  // 5. Create environments
  createEnvironments(repos, teams);

  // 6. Create secrets (from Pulumi config)
  const config = new pulumi.Config();
  const mainRepo = repos['resist.js'];

  if (mainRepo) {
    createSecrets(mainRepo, [
      // Repository secrets
      { name: 'CLOUDFLARE_API_TOKEN', value: config.requireSecret('cloudflareApiToken') },
      { name: 'CLOUDFLARE_ACCOUNT_ID', value: config.require('cloudflareAccountId') },
      { name: 'TURBO_TOKEN', value: config.getSecret('turboToken') || '' },
      { name: 'TURBO_TEAM', value: config.get('turboTeam') || '' },

      // Staging environment secrets
      { name: 'CLOUDFLARE_API_TOKEN', value: config.requireSecret('cloudflareApiToken'), environment: 'staging' },

      // Production environment secrets
      { name: 'CLOUDFLARE_API_TOKEN', value: config.requireSecret('cloudflareApiToken'), environment: 'production' },

      // Mobile secrets
      { name: 'MATCH_PASSWORD', value: config.requireSecret('matchPassword') },
      { name: 'MATCH_GIT_TOKEN', value: config.requireSecret('matchGitToken') },
      { name: 'APP_STORE_CONNECT_API_KEY_ID', value: config.requireSecret('appStoreApiKeyId') },
      { name: 'APP_STORE_CONNECT_API_ISSUER_ID', value: config.requireSecret('appStoreApiIssuerId') },
      { name: 'APP_STORE_CONNECT_API_KEY', value: config.requireSecret('appStoreApiKey') },
      { name: 'ANDROID_KEYSTORE_BASE64', value: config.requireSecret('androidKeystoreBase64') },
      { name: 'ANDROID_KEYSTORE_PASSWORD', value: config.requireSecret('androidKeystorePassword') },
      { name: 'ANDROID_KEY_ALIAS', value: config.requireSecret('androidKeyAlias') },
      { name: 'ANDROID_KEY_PASSWORD', value: config.requireSecret('androidKeyPassword') },
      { name: 'GOOGLE_PLAY_JSON_KEY', value: config.requireSecret('googlePlayJsonKey') },
    ]);
  }

  return { teams, repos };
}
```

---

## Part 3: Additional Files

### CODEOWNERS

```text
# .github/CODEOWNERS

# Default owners for everything
* @resist-js/core

# Infrastructure
/packages/shared/iac/ @resist-js/core

# Shared packages
/packages/shared/ @resist-js/engineering

# Products
/packages/products/tastier/ @resist-js/engineering
/packages/products/cherishall/ @resist-js/engineering

# Documentation
/docs/ @resist-js/engineering @resist-js/design

# Config and root
/config/ @resist-js/core
/*.json @resist-js/core
/*.yaml @resist-js/core
/*.yml @resist-js/core
```

### Issue Templates

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Report a bug or unexpected behavior
title: "[Bug]: "
labels: ["type: bug", "status: ready"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report this bug!

  - type: dropdown
    id: product
    attributes:
      label: Product
      description: Which product is affected?
      options:
        - Tastier
        - Cherishall
        - Shared packages
        - Infrastructure
    validations:
      required: true

  - type: dropdown
    id: area
    attributes:
      label: Area
      description: Which area is affected?
      options:
        - API
        - App (Web)
        - App (iOS)
        - App (Android)
        - Marketing site
        - Other
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of the bug
      placeholder: What happened?
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: How can we reproduce this issue?
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Add any other context, screenshots, or error messages
```

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: Feature Request
description: Suggest a new feature or enhancement
title: "[Feature]: "
labels: ["type: feature", "status: ready"]
body:
  - type: dropdown
    id: product
    attributes:
      label: Product
      description: Which product is this for?
      options:
        - Tastier
        - Cherishall
        - Shared packages
        - Infrastructure
        - All products
    validations:
      required: true

  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem does this feature solve?
      placeholder: I'm always frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Any alternative solutions you've considered?

  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Add any other context, mockups, or examples
```

### PR Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## Summary

<!-- Brief description of what this PR does -->

## Type

- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Refactor
- [ ] Documentation
- [ ] Chore

## Product/Area

- [ ] Tastier
- [ ] Cherishall
- [ ] Shared packages
- [ ] Infrastructure
- [ ] CI/CD
- [ ] Documentation

## Changes

<!-- List the main changes -->

-
-
-

## Testing

<!-- How has this been tested? -->

- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes (or documented if unavoidable)

## Screenshots

<!-- If applicable, add screenshots -->

## Related Issues

<!-- Link related issues: Fixes #123, Closes #456 -->
```

---

## Part 4: Dependabot Config

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    groups:
      svelte:
        patterns:
          - "svelte*"
          - "@sveltejs/*"
      cloudflare:
        patterns:
          - "@cloudflare/*"
          - "wrangler"
      testing:
        patterns:
          - "vitest*"
          - "@vitest/*"
          - "playwright*"
          - "@playwright/*"
      typescript:
        patterns:
          - "typescript"
          - "@types/*"
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-patch"]
    labels:
      - "dependencies"
    commit-message:
      prefix: "chore(deps):"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "area: ci/cd"
    commit-message:
      prefix: "chore(ci):"
```

---

## Summary

| Component | Configuration |
|-----------|---------------|
| Organization | Settings, security features |
| Teams | Core, engineering, design, contractors |
| Repositories | Main repo + certificates |
| Branch Protection | Required reviews, status checks |
| Labels | Type, priority, status, product, area |
| Environments | Staging, production with reviewers |
| Secrets | Cloudflare, Turbo, mobile signing |
| Templates | Issue templates, PR template |
| CODEOWNERS | Team-based ownership |
| Dependabot | Weekly updates, grouped |

## Implementation Order

1. **Day 1**: Pulumi provider setup, organization settings
2. **Day 2**: Teams configuration
3. **Day 3**: Repository creation, branch protection
4. **Day 4**: Labels, environments
5. **Day 5**: Secrets configuration
6. **Day 6**: Templates, CODEOWNERS, dependabot
7. **Day 7**: Testing, documentation
