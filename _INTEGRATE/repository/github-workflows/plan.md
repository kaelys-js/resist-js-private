# GitHub Workflows Plan

> Comprehensive CI/CD automation for monorepo: releases, dependencies, previews, performance, mobile, and security

## Overview

All automation runs via GitHub Actions. Monorepo-wide releases with release-please, per-PR preview environments, Fastlane for mobile, and Renovate for dependencies.

## Workflow Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR, push to main | Lint, type-check, test, build |
| `release.yml` | Push to main | Release-please PR, changelog |
| `deploy-staging.yml` | Push to main | Deploy all products to staging |
| `deploy-prod.yml` | Release published | Deploy all products to production |
| `preview.yml` | PR opened/updated | Deploy preview environments |
| `preview-cleanup.yml` | PR closed | Teardown preview environments |
| `mobile-beta.yml` | Push to main | Build & deploy to TestFlight/Play Internal |
| `mobile-release.yml` | Release published | Submit to App Store/Play Store |
| `performance.yml` | PR | Lighthouse CI, bundle size check |
| `assets.yml` | PR | Optimize images/SVGs |
| `i18n.yml` | Push to main, PR | Translation coverage, GitLocalize sync |
| `security.yml` | Schedule, PR | Dependency audit, secret scanning |

---

## Part 1: Core CI

### ci.yml

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Format check
        run: pnpm format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: |
            packages/**/dist
            packages/**/.svelte-kit
          retention-days: 1
```

---

## Part 2: Release Management

### release.yml (release-please)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Release Please
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
      tag_name: ${{ steps.release.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
          # Monorepo config
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

      - name: Output release info
        if: ${{ steps.release.outputs.release_created }}
        run: |
          echo "Release created: ${{ steps.release.outputs.tag_name }}"
          echo "Version: ${{ steps.release.outputs.version }}"
```

### release-please-config.json

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "node",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true,
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false,
      "include-v-in-tag": true
    }
  },
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "refactor", "section": "Code Refactoring" },
    { "type": "docs", "section": "Documentation" },
    { "type": "chore", "section": "Miscellaneous", "hidden": true },
    { "type": "test", "section": "Tests", "hidden": true },
    { "type": "ci", "section": "CI/CD", "hidden": true }
  ]
}
```

### .release-please-manifest.json

```json
{
  ".": "0.0.0"
}
```

---

## Part 3: Deployment

### deploy-staging.yml

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-staging
  cancel-in-progress: false

env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.product }}
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/...

      - name: Apply database migrations
        run: |
          pnpm --filter @resist/db db:migrate staging ${{ matrix.product }}

      - name: Deploy API
        working-directory: packages/products/${{ matrix.product }}/api
        run: wrangler deploy --env staging

      - name: Deploy Status
        working-directory: packages/products/${{ matrix.product }}/status
        run: wrangler deploy --env staging

      - name: Deploy Marketing
        working-directory: packages/products/${{ matrix.product }}/marketing
        run: wrangler pages deploy dist --project-name=${{ matrix.product }}-marketing-staging

      - name: Deploy App
        working-directory: packages/products/${{ matrix.product }}/app
        run: wrangler pages deploy build --project-name=${{ matrix.product }}-app-staging

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: deploy
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm --filter ./packages/products/${{ matrix.product }}/tester test:e2e
        env:
          BASE_URL: https://${{ matrix.product }}-staging.app
```

### deploy-prod.yml

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      tag:
        description: 'Release tag to deploy'
        required: true

concurrency:
  group: deploy-prod
  cancel-in-progress: false

env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name || github.event.inputs.tag }}

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.product }}
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/...

      - name: Apply database migrations
        run: |
          pnpm --filter @resist/db db:migrate prod ${{ matrix.product }}

      - name: Deploy API
        working-directory: packages/products/${{ matrix.product }}/api
        run: wrangler deploy --env production

      - name: Deploy Status
        working-directory: packages/products/${{ matrix.product }}/status
        run: wrangler deploy --env production

      - name: Deploy Marketing
        working-directory: packages/products/${{ matrix.product }}/marketing
        run: wrangler pages deploy dist --project-name=${{ matrix.product }}-marketing

      - name: Deploy App
        working-directory: packages/products/${{ matrix.product }}/app
        run: wrangler pages deploy build --project-name=${{ matrix.product }}-app

  notify:
    name: Notify
    runs-on: ubuntu-latest
    needs: deploy
    if: always()
    steps:
      - name: Notify on success
        if: needs.deploy.result == 'success'
        run: |
          echo "Production deployment successful: ${{ github.event.release.tag_name || github.event.inputs.tag }}"
          # Add Slack/Discord notification here

      - name: Notify on failure
        if: needs.deploy.result == 'failure'
        run: |
          echo "Production deployment FAILED: ${{ github.event.release.tag_name || github.event.inputs.tag }}"
          # Add Slack/Discord notification here
```

---

## Part 4: Preview Environments

### preview.yml

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  detect-changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      products: ${{ steps.changes.outputs.products }}
    steps:
      - uses: actions/checkout@v4

      - name: Get changed products
        id: changes
        run: |
          # Get list of changed files
          CHANGED=$(gh pr diff ${{ github.event.pull_request.number }} --name-only)

          # Detect which products changed
          PRODUCTS="[]"
          if echo "$CHANGED" | grep -q "packages/products/tastier"; then
            PRODUCTS=$(echo "$PRODUCTS" | jq '. + ["tastier"]')
          fi
          if echo "$CHANGED" | grep -q "packages/products/cherishall"; then
            PRODUCTS=$(echo "$PRODUCTS" | jq '. + ["cherishall"]')
          fi
          # If shared packages changed, deploy all
          if echo "$CHANGED" | grep -q "packages/shared"; then
            PRODUCTS='["tastier", "cherishall"]'
          fi

          echo "products=$PRODUCTS" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: detect-changes
    if: needs.detect-changes.outputs.products != '[]'
    strategy:
      matrix:
        product: ${{ fromJson(needs.detect-changes.outputs.products) }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.product }}
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/...

      - name: Get branch name
        id: branch
        run: |
          BRANCH="${{ github.head_ref }}"
          # Sanitize branch name for DNS
          SAFE_BRANCH=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | cut -c1-20)
          echo "name=$SAFE_BRANCH" >> $GITHUB_OUTPUT

      - name: Deploy API Preview
        working-directory: packages/products/${{ matrix.product }}/api
        run: |
          wrangler deploy \
            --name ${{ steps.branch.outputs.name }}-api-${{ matrix.product }} \
            --route "${{ steps.branch.outputs.name }}.api.${{ matrix.product }}-staging.app/*"

      - name: Deploy Status Preview
        working-directory: packages/products/${{ matrix.product }}/status
        run: |
          wrangler deploy \
            --name ${{ steps.branch.outputs.name }}-status-${{ matrix.product }} \
            --route "${{ steps.branch.outputs.name }}.status.${{ matrix.product }}-staging.app/*"

      - name: Deploy Marketing Preview
        working-directory: packages/products/${{ matrix.product }}/marketing
        run: |
          wrangler pages deploy dist \
            --project-name=${{ matrix.product }}-marketing-staging \
            --branch=${{ steps.branch.outputs.name }}

      - name: Deploy App Preview
        working-directory: packages/products/${{ matrix.product }}/app
        run: |
          wrangler pages deploy build \
            --project-name=${{ matrix.product }}-app-staging \
            --branch=${{ steps.branch.outputs.name }}

      - name: Comment preview URLs
        uses: actions/github-script@v7
        with:
          script: |
            const branch = '${{ steps.branch.outputs.name }}';
            const product = '${{ matrix.product }}';

            const urls = [
              `**${product}**`,
              `- 🌐 Marketing: https://${branch}.${{ matrix.product }}-marketing-staging.pages.dev`,
              `- 📱 App: https://${branch}.${{ matrix.product }}-app-staging.pages.dev`,
              `- 🔌 API: https://${branch}.api.${product}-staging.app`,
              `- 📊 Status: https://${branch}.status.${product}-staging.app`,
            ].join('\n');

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const marker = `<!-- preview-${product} -->`;
            const existing = comments.find(c => c.body.includes(marker));

            const body = `${marker}\n## Preview Environment\n\n${urls}\n\n_Updated: ${new Date().toISOString()}_`;

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

### preview-cleanup.yml

```yaml
# .github/workflows/preview-cleanup.yml
name: Preview Cleanup

on:
  pull_request:
    types: [closed]

env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  cleanup:
    name: Cleanup Preview
    runs-on: ubuntu-latest
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - name: Get branch name
        id: branch
        run: |
          BRANCH="${{ github.head_ref }}"
          SAFE_BRANCH=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | cut -c1-20)
          echo "name=$SAFE_BRANCH" >> $GITHUB_OUTPUT

      - name: Delete API Worker
        run: |
          wrangler delete ${{ steps.branch.outputs.name }}-api-${{ matrix.product }} --force || true

      - name: Delete Status Worker
        run: |
          wrangler delete ${{ steps.branch.outputs.name }}-status-${{ matrix.product }} --force || true

      # Note: Pages preview deployments are auto-cleaned by Cloudflare
```

---

## Part 5: Mobile Release (Fastlane)

### mobile-beta.yml

```yaml
# .github/workflows/mobile-beta.yml
name: Mobile Beta

on:
  push:
    branches: [main]
    paths:
      - 'packages/products/*/app/**'
      - 'packages/shared/ui/**'
  workflow_dispatch:
    inputs:
      product:
        description: 'Product to build'
        required: true
        type: choice
        options:
          - tastier
          - cherishall
          - all

jobs:
  detect-changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      products: ${{ steps.changes.outputs.products }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Get changed products
        id: changes
        run: |
          if [ "${{ github.event.inputs.product }}" == "all" ]; then
            echo 'products=["tastier", "cherishall"]' >> $GITHUB_OUTPUT
          elif [ -n "${{ github.event.inputs.product }}" ]; then
            echo 'products=["${{ github.event.inputs.product }}"]' >> $GITHUB_OUTPUT
          else
            CHANGED=$(git diff --name-only HEAD~1)
            PRODUCTS="[]"
            if echo "$CHANGED" | grep -qE "packages/products/tastier/app|packages/shared"; then
              PRODUCTS=$(echo "$PRODUCTS" | jq '. + ["tastier"]')
            fi
            if echo "$CHANGED" | grep -qE "packages/products/cherishall/app|packages/shared"; then
              PRODUCTS=$(echo "$PRODUCTS" | jq '. + ["cherishall"]')
            fi
            echo "products=$PRODUCTS" >> $GITHUB_OUTPUT
          fi

  build-ios:
    name: iOS Beta
    runs-on: macos-14
    needs: detect-changes
    if: needs.detect-changes.outputs.products != '[]'
    strategy:
      matrix:
        product: ${{ fromJson(needs.detect-changes.outputs.products) }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/app

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: packages/products/${{ matrix.product }}/app

      - name: Sync Capacitor
        working-directory: packages/products/${{ matrix.product }}/app
        run: npx cap sync ios

      - name: Install CocoaPods
        working-directory: packages/products/${{ matrix.product }}/app/ios/App
        run: pod install

      - name: Setup certificates
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_TOKEN }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane ios certificates

      - name: Build and upload to TestFlight
        env:
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane ios beta

  build-android:
    name: Android Beta
    runs-on: ubuntu-latest
    needs: detect-changes
    if: needs.detect-changes.outputs.products != '[]'
    strategy:
      matrix:
        product: ${{ fromJson(needs.detect-changes.outputs.products) }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/app

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: packages/products/${{ matrix.product }}/app

      - name: Sync Capacitor
        working-directory: packages/products/${{ matrix.product }}/app
        run: npx cap sync android

      - name: Decode keystore
        working-directory: packages/products/${{ matrix.product }}/app
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

      - name: Build and upload to Play Store Internal
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          GOOGLE_PLAY_JSON_KEY: ${{ secrets.GOOGLE_PLAY_JSON_KEY }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane android beta
```

### mobile-release.yml

```yaml
# .github/workflows/mobile-release.yml
name: Mobile Release

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      product:
        description: 'Product to release'
        required: true
        type: choice
        options:
          - tastier
          - cherishall
      version:
        description: 'Version to release'
        required: true

jobs:
  release-ios:
    name: iOS App Store
    runs-on: macos-14
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name || github.ref }}

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/app

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: packages/products/${{ matrix.product }}/app

      - name: Sync Capacitor
        working-directory: packages/products/${{ matrix.product }}/app
        run: npx cap sync ios

      - name: Install CocoaPods
        working-directory: packages/products/${{ matrix.product }}/app/ios/App
        run: pod install

      - name: Setup certificates
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_TOKEN }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane ios certificates

      - name: Submit to App Store
        env:
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_API_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane ios release

  release-android:
    name: Android Play Store
    runs-on: ubuntu-latest
    strategy:
      matrix:
        product: [tastier, cherishall]
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name || github.ref }}

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm turbo build --filter=./packages/products/${{ matrix.product }}/app

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: packages/products/${{ matrix.product }}/app

      - name: Sync Capacitor
        working-directory: packages/products/${{ matrix.product }}/app
        run: npx cap sync android

      - name: Decode keystore
        working-directory: packages/products/${{ matrix.product }}/app
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

      - name: Submit to Play Store
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          GOOGLE_PLAY_JSON_KEY: ${{ secrets.GOOGLE_PLAY_JSON_KEY }}
        working-directory: packages/products/${{ matrix.product }}/app
        run: bundle exec fastlane android release
```

### Fastfile (per product)

```ruby
# packages/products/tastier/app/fastlane/Fastfile

default_platform(:ios)

platform :ios do
  desc "Sync certificates with match"
  lane :certificates do
    match(
      type: "appstore",
      readonly: true,
      app_identifier: "app.tastier"
    )
  end

  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number(
      build_number: ENV["GITHUB_RUN_NUMBER"],
      xcodeproj: "ios/App/App.xcodeproj"
    )

    build_app(
      workspace: "ios/App/App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      output_directory: "./build"
    )

    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Submit to App Store"
  lane :release do
    increment_build_number(
      build_number: ENV["GITHUB_RUN_NUMBER"],
      xcodeproj: "ios/App/App.xcodeproj"
    )

    build_app(
      workspace: "ios/App/App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      output_directory: "./build"
    )

    upload_to_app_store(
      submit_for_review: true,
      automatic_release: true,
      force: true,
      precheck_include_in_app_purchases: false,
      submission_information: {
        add_id_info_uses_idfa: false
      }
    )
  end
end

platform :android do
  desc "Build and upload to Play Store Internal"
  lane :beta do
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android"
    )

    upload_to_play_store(
      track: "internal",
      aab: "android/app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Promote to Production"
  lane :release do
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android"
    )

    upload_to_play_store(
      track: "production",
      aab: "android/app/build/outputs/bundle/release/app-release.aab"
    )
  end
end
```

---

## Part 6: Performance CI

### performance.yml

```yaml
# .github/workflows/performance.yml
name: Performance

on:
  pull_request:
    paths:
      - 'packages/products/*/app/**'
      - 'packages/products/*/marketing/**'
      - 'packages/shared/ui/**'

jobs:
  bundle-size:
    name: Bundle Size
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Check bundle size
        uses: preactjs/compressed-size-action@v2
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          pattern: |
            packages/products/*/app/build/**/*.js
            packages/products/*/marketing/build/**/*.js
          # Fail if bundle grows by more than 5%
          minimum-change-threshold: 100
          # Configurable threshold
          compression: gzip

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build marketing sites
        run: pnpm turbo build --filter=./packages/products/*/marketing

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### lighthouserc.json

```json
{
  "ci": {
    "collect": {
      "staticDistDir": [
        "./packages/products/tastier/marketing/build",
        "./packages/products/cherishall/marketing/build"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## Part 7: Asset Optimization

### assets.yml

```yaml
# .github/workflows/assets.yml
name: Asset Optimization

on:
  pull_request:
    paths:
      - '**/*.png'
      - '**/*.jpg'
      - '**/*.jpeg'
      - '**/*.webp'
      - '**/*.svg'

jobs:
  optimize:
    name: Optimize Assets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Install optimization tools
        run: |
          pnpm add -g svgo sharp-cli

      - name: Get changed files
        id: changed
        run: |
          FILES=$(gh pr diff ${{ github.event.pull_request.number }} --name-only | grep -E '\.(png|jpg|jpeg|webp|svg)$' || true)
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Optimize images
        if: steps.changed.outputs.files != ''
        run: |
          echo "${{ steps.changed.outputs.files }}" | while read file; do
            if [ -f "$file" ]; then
              case "$file" in
                *.svg)
                  svgo --multipass "$file"
                  ;;
                *.png|*.jpg|*.jpeg|*.webp)
                  sharp -i "$file" -o "$file" --quality 85
                  ;;
              esac
            fi
          done

      - name: Commit optimized assets
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: optimize images [skip ci]'
          file_pattern: '*.png *.jpg *.jpeg *.webp *.svg'
```

---

## Part 8: Dependency Management (Renovate)

### renovate.json

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":semanticCommits",
    ":automergeMinor",
    ":automergeDigest",
    "group:monorepos",
    "group:recommended"
  ],
  "labels": ["dependencies"],
  "rangeStrategy": "bump",
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 6am on monday"]
  },
  "packageRules": [
    {
      "description": "Auto-merge patch updates",
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr",
      "platformAutomerge": true
    },
    {
      "description": "Auto-merge minor dev dependencies",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["minor"],
      "automerge": true
    },
    {
      "description": "Group Svelte packages",
      "matchPackagePatterns": ["^svelte", "^@sveltejs/"],
      "groupName": "Svelte packages"
    },
    {
      "description": "Group Cloudflare packages",
      "matchPackagePatterns": ["^@cloudflare/", "^wrangler"],
      "groupName": "Cloudflare packages"
    },
    {
      "description": "Group Drizzle packages",
      "matchPackagePatterns": ["^drizzle"],
      "groupName": "Drizzle packages"
    },
    {
      "description": "Group Valibot packages",
      "matchPackagePatterns": ["^valibot", "^@valibot/"],
      "groupName": "Valibot packages"
    },
    {
      "description": "Group TypeScript and related",
      "matchPackagePatterns": ["^typescript", "^@types/"],
      "groupName": "TypeScript packages"
    },
    {
      "description": "Group test packages",
      "matchPackagePatterns": ["^vitest", "^@vitest/", "^playwright", "^@playwright/"],
      "groupName": "Testing packages"
    },
    {
      "description": "Schedule major updates weekly",
      "matchUpdateTypes": ["major"],
      "schedule": ["after 9am and before 5pm on monday"]
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "automerge": true
  }
}
```

---

## Part 9: i18n with GitLocalize

GitLocalize automatically syncs with your repo and creates PRs with translations when translators complete their work.

### Setup

1. Connect repo at [gitlocalize.com](https://gitlocalize.com)
2. Configure source language (English) and target languages
3. Set translation paths

### gitlocalize.yml

```yaml
# .gitlocalize.yml
source_language: en
target_languages:
  - es
  - fr
  - de
  - ja
  - zh

source_paths:
  # Documentation
  - path: docs/src/content/docs/en/**/*.mdx
    target: docs/src/content/docs/{lang}/**/*.mdx

  # Marketing site translations
  - path: packages/products/*/marketing/src/lib/i18n/en.json
    target: packages/products/*/marketing/src/lib/i18n/{lang}.json

  # App translations
  - path: packages/products/*/app/src/lib/i18n/en.json
    target: packages/products/*/app/src/lib/i18n/{lang}.json

# Files to exclude
ignore_paths:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/.svelte-kit/**'
```

### Translation Sync Workflow

```yaml
# .github/workflows/i18n.yml
name: i18n

on:
  push:
    branches: [main]
    paths:
      - 'docs/src/content/docs/en/**'
      - 'packages/products/*/marketing/src/lib/i18n/en.json'
      - 'packages/products/*/app/src/lib/i18n/en.json'
  pull_request:
    paths:
      - 'docs/src/content/docs/**'
      - 'packages/products/*/marketing/src/lib/i18n/**'
      - 'packages/products/*/app/src/lib/i18n/**'

jobs:
  check-translations:
    name: Check Translation Coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Check translation coverage
        run: pnpm tsx scripts/check-translations.ts

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');

            // Read coverage report
            const report = fs.readFileSync('translation-coverage.json', 'utf8');
            const coverage = JSON.parse(report);

            let body = '## Translation Coverage\n\n';
            body += '| Language | Docs | Marketing | App |\n';
            body += '|----------|------|-----------|-----|\n';

            for (const [lang, data] of Object.entries(coverage)) {
              body += `| ${lang} | ${data.docs}% | ${data.marketing}% | ${data.app}% |\n`;
            }

            body += '\n*Run `pnpm i18n:status` for details.*';

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });

  notify-gitlocalize:
    name: Notify GitLocalize
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Trigger GitLocalize sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.GITLOCALIZE_TOKEN }}" \
            -H "Content-Type: application/json" \
            https://gitlocalize.com/api/v1/repos/${{ github.repository }}/sync
```

### Translation Check Script

```typescript
// scripts/check-translations.ts
import { glob } from 'glob';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const LOCALES = ['es', 'fr', 'de', 'ja', 'zh'];
const BASE_LOCALE = 'en';

interface CoverageReport {
  [locale: string]: {
    docs: number;
    marketing: number;
    app: number;
  };
}

async function checkDocsCoverage(locale: string): Promise<number> {
  const baseDocs = await glob(`docs/src/content/docs/${BASE_LOCALE}/**/*.mdx`);
  const translatedDocs = await glob(`docs/src/content/docs/${locale}/**/*.mdx`);

  return Math.round((translatedDocs.length / baseDocs.length) * 100);
}

async function checkJsonCoverage(basePath: string, localePath: string): Promise<number> {
  try {
    const baseContent = JSON.parse(await readFile(basePath, 'utf-8'));
    const localeContent = JSON.parse(await readFile(localePath, 'utf-8'));

    const baseKeys = Object.keys(flattenObject(baseContent));
    const localeKeys = Object.keys(flattenObject(localeContent));

    const translated = baseKeys.filter(k => localeKeys.includes(k)).length;
    return Math.round((translated / baseKeys.length) * 100);
  } catch {
    return 0;
  }
}

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

async function main() {
  const report: CoverageReport = {};

  for (const locale of LOCALES) {
    report[locale] = {
      docs: await checkDocsCoverage(locale),
      marketing: 0,
      app: 0,
    };

    // Check marketing translations for each product
    const marketingBase = await glob('packages/products/*/marketing/src/lib/i18n/en.json');
    let marketingTotal = 0;
    let marketingCount = 0;

    for (const basePath of marketingBase) {
      const localePath = basePath.replace('/en.json', `/${locale}.json`);
      marketingTotal += await checkJsonCoverage(basePath, localePath);
      marketingCount++;
    }

    report[locale].marketing = marketingCount > 0 ? Math.round(marketingTotal / marketingCount) : 0;

    // Check app translations
    const appBase = await glob('packages/products/*/app/src/lib/i18n/en.json');
    let appTotal = 0;
    let appCount = 0;

    for (const basePath of appBase) {
      const localePath = basePath.replace('/en.json', `/${locale}.json`);
      appTotal += await checkJsonCoverage(basePath, localePath);
      appCount++;
    }

    report[locale].app = appCount > 0 ? Math.round(appTotal / appCount) : 0;
  }

  await writeFile('translation-coverage.json', JSON.stringify(report, null, 2));

  // Print report
  console.log('\nTranslation Coverage Report\n');
  console.log('| Language | Docs | Marketing | App |');
  console.log('|----------|------|-----------|-----|');

  for (const [locale, data] of Object.entries(report)) {
    console.log(`| ${locale.padEnd(8)} | ${String(data.docs).padEnd(4)}% | ${String(data.marketing).padEnd(9)}% | ${String(data.app).padEnd(3)}% |`);
  }
}

main().catch(console.error);
```

---

## Part 10: Security Scanning

### security.yml

```yaml
# .github/workflows/security.yml
name: Security

on:
  pull_request:
    paths:
      - '**/package.json'
      - '**/pnpm-lock.yaml'
  schedule:
    - cron: '0 9 * * 1' # Weekly Monday 9am
  workflow_dispatch:

jobs:
  audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Run audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Create issue on failure
        if: failure() && github.event_name == 'schedule'
        uses: actions/github-script@v7
        with:
          script: |
            const title = '🔒 Security: Dependency vulnerabilities found';
            const body = `Weekly security audit found vulnerabilities.\n\nRun \`pnpm audit\` locally for details.`;

            // Check for existing open issue
            const { data: issues } = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              labels: 'security'
            });

            if (!issues.some(i => i.title === title)) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title,
                body,
                labels: ['security']
              });
            }

  secrets:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Gitleaks scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  sbom:
    name: Generate SBOM
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Generate SBOM
        run: |
          npx @cyclonedx/cyclonedx-npm --output-file sbom.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
          retention-days: 90
```

---

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deployments |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `CODECOV_TOKEN` | Coverage uploads |
| `MATCH_PASSWORD` | iOS code signing |
| `MATCH_GIT_TOKEN` | Access to certificates repo |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect |
| `APP_STORE_CONNECT_API_ISSUER_ID` | App Store Connect |
| `APP_STORE_CONNECT_API_KEY` | App Store Connect (base64) |
| `ANDROID_KEYSTORE_BASE64` | Android signing key |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_JSON_KEY` | Play Store service account |

---

## Summary

| Workflow | Trigger | Auto |
|----------|---------|------|
| CI | PR, push | ✓ |
| Release | Push to main | ✓ (creates PR) |
| Deploy Staging | Push to main | ✓ |
| Deploy Prod | Release published | ✓ |
| Preview | PR | ✓ |
| Mobile Beta | Push to main (app changes) | ✓ |
| Mobile Release | Release published | ✓ |
| Performance | PR | ✓ |
| Assets | PR (images) | ✓ |
| i18n | Push to main, PR | ✓ |
| Security | Weekly + PR | ✓ |

## Implementation Order

1. **Day 1**: ci.yml, basic lint/test/build
2. **Day 2**: release.yml, release-please config
3. **Day 3**: deploy-staging.yml, deploy-prod.yml
4. **Day 4**: preview.yml, preview-cleanup.yml
5. **Day 5**: performance.yml, lighthouserc.json
6. **Day 6**: assets.yml, renovate.json
7. **Day 7**: security.yml, secret setup
8. **Day 8**: mobile-beta.yml, Fastlane setup
9. **Day 9**: mobile-release.yml, App Store/Play Store config
10. **Day 10**: i18n.yml, GitLocalize setup
11. **Day 11**: Testing, documentation
