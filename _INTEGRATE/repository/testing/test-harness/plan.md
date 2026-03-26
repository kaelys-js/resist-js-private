# Test Harness Implementation Plan

> **ARCHITECTURE CHANGE**: This plan is being revised. The per-product `tester/` layer is being removed.
>
> **New model:**
> - Tests live alongside code in `api/`, `app/`, etc. (not in separate `tester/` layer)
> - Global QA dashboard at `packages/tools/qa/` aggregates results from ALL products
> - Access at `qa.localhost` (single dashboard, not per-product)
>
> Much of this plan needs updating to reflect the new structure.

Unified testing infrastructure with real-time dashboard at `qa.localhost`.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    qa.tastier.localhost                         │
│  ┌───────────┬───────────┬───────────┬───────────┬───────────┐  │
│  │  Summary  │   Unit    │   E2E     │  Mobile   │   Bench   │  │
│  │           │  Tests    │   Web     │   E2E     │   marks   │  │
│  └───────────┴───────────┴───────────┴───────────┴───────────┘  │
└─────────────────────────────────────────────────────────────────┘
        ▲               ▲           ▲           ▲
        │               │           │           │
   WebSocket       WebSocket   WebSocket    File Watch
        │               │           │           │
┌───────────┐    ┌───────────┐ ┌───────────┐ ┌───────────┐
│  Vitest   │    │ Playwright│ │  Maestro  │ │  Vitest   │
│  Tests    │    │           │ │           │ │  Bench    │
└───────────┘    └───────────┘ └───────────┘ └───────────┘
```

## Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Unit Tests | Vitest | Fast, Vite-native, watch mode |
| Code Coverage | Vitest + v8 | Built-in, fast |
| Benchmarks | Vitest bench | tinybench under the hood |
| E2E Web | Playwright | Multi-browser, visual regression |
| E2E Mobile | Maestro | iOS/Android simulators, YAML flows |
| Dashboard | SvelteKit | Real-time WebSocket UI |

## Directory Structure

```
packages/
├── shared/
│   └── test-harness/                 # Shared test infrastructure
│       ├── src/
│       │   ├── reporters/
│       │   │   ├── vitest-ws-reporter.ts
│       │   │   └── playwright-ws-reporter.ts
│       │   ├── dashboard/
│       │   │   ├── server.ts         # WebSocket server
│       │   │   └── types.ts          # Event types
│       │   ├── maestro/
│       │   │   └── watcher.ts        # File watcher for Maestro output
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
└── products/
    └── <product>/
        └── tester/
            ├── unit/                 # Vitest tests
            │   ├── **/*.test.ts
            │   └── vitest.config.ts
            ├── bench/                # Benchmarks
            │   ├── **/*.bench.ts
            │   └── vitest.config.ts
            ├── e2e/
            │   ├── web/              # Playwright
            │   │   ├── tests/
            │   │   │   └── **/*.spec.ts
            │   │   ├── playwright.config.ts
            │   │   └── snapshots/    # Visual regression baselines
            │   └── mobile/           # Maestro
            │       └── flows/
            │           └── **/*.yaml
            ├── dashboard/            # QA Dashboard UI
            │   ├── src/
            │   │   ├── routes/
            │   │   │   ├── +page.svelte        # Summary
            │   │   │   ├── unit/+page.svelte
            │   │   │   ├── e2e/+page.svelte
            │   │   │   ├── mobile/+page.svelte
            │   │   │   └── bench/+page.svelte
            │   │   ├── lib/
            │   │   │   ├── stores/
            │   │   │   │   └── test-results.svelte.ts
            │   │   │   └── components/
            │   │   │       ├── TestList.svelte
            │   │   │       ├── CoverageChart.svelte
            │   │   │       ├── BenchmarkTable.svelte
            │   │   │       └── ScreenshotDiff.svelte
            │   │   └── app.html
            │   ├── svelte.config.js
            │   └── vite.config.ts
            └── package.json
```

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 WebSocket Event Types

```typescript
// packages/shared/test-harness/src/dashboard/types.ts

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export type TestEvent =
  | { type: 'suite:start'; suite: string; timestamp: number }
  | { type: 'suite:end'; suite: string; duration: number; passed: number; failed: number }
  | { type: 'test:start'; suite: string; test: string; timestamp: number }
  | { type: 'test:end'; suite: string; test: string; status: TestStatus; duration: number; error?: string }
  | { type: 'coverage'; data: CoverageData }
  | { type: 'benchmark:result'; name: string; ops: number; margin: number; samples: number };

export type E2EEvent =
  | { type: 'e2e:start'; browser: string; test: string; timestamp: number }
  | { type: 'e2e:end'; browser: string; test: string; status: TestStatus; duration: number; error?: string }
  | { type: 'e2e:screenshot'; test: string; path: string; diff?: string }
  | { type: 'e2e:trace'; test: string; path: string };

export type MobileEvent =
  | { type: 'mobile:flow:start'; flow: string; platform: 'ios' | 'android'; timestamp: number }
  | { type: 'mobile:flow:end'; flow: string; platform: 'ios' | 'android'; status: TestStatus; duration: number }
  | { type: 'mobile:step'; flow: string; step: string; status: TestStatus };

export type DashboardEvent = TestEvent | E2EEvent | MobileEvent;

export interface CoverageData {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}
```

#### 1.2 WebSocket Server

```typescript
// packages/shared/test-harness/src/dashboard/server.ts

import { WebSocketServer, WebSocket } from 'ws';
import type { DashboardEvent } from './types';

export class DashboardServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(port: number = 9100) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
    });

    console.log(`Dashboard WebSocket server running on ws://localhost:${port}`);
  }

  broadcast(event: DashboardEvent) {
    const message = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close() {
    this.wss.close();
  }
}
```

#### 1.3 Vitest WebSocket Reporter

```typescript
// packages/shared/test-harness/src/reporters/vitest-ws-reporter.ts

import type { Reporter, File, Task } from 'vitest';
import WebSocket from 'ws';

export default class WebSocketReporter implements Reporter {
  private ws: WebSocket | null = null;
  private wsUrl: string;

  constructor(options: { url?: string } = {}) {
    this.wsUrl = options.url ?? 'ws://localhost:9100';
  }

  onInit() {
    this.ws = new WebSocket(this.wsUrl);
  }

  private send(event: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  onCollected(files?: File[]) {
    for (const file of files ?? []) {
      this.send({ type: 'suite:start', suite: file.name, timestamp: Date.now() });
    }
  }

  onTaskUpdate(packs: [string, Task][]) {
    for (const [, task] of packs) {
      if (task.type === 'test') {
        this.send({
          type: task.result?.state === 'pass' || task.result?.state === 'fail' ? 'test:end' : 'test:start',
          suite: task.file?.name ?? '',
          test: task.name,
          status: task.result?.state ?? 'running',
          duration: task.result?.duration ?? 0,
          error: task.result?.errors?.[0]?.message,
          timestamp: Date.now(),
        });
      }
    }
  }

  onFinished(files?: File[], errors?: unknown[]) {
    for (const file of files ?? []) {
      const tasks = file.tasks.flatMap((t) => (t.type === 'suite' ? t.tasks : [t]));
      const passed = tasks.filter((t) => t.result?.state === 'pass').length;
      const failed = tasks.filter((t) => t.result?.state === 'fail').length;

      this.send({
        type: 'suite:end',
        suite: file.name,
        duration: file.result?.duration ?? 0,
        passed,
        failed,
      });
    }

    this.ws?.close();
  }

  onCoverage(coverage: unknown) {
    this.send({ type: 'coverage', data: coverage });
  }
}
```

#### 1.4 Playwright WebSocket Reporter

```typescript
// packages/shared/test-harness/src/reporters/playwright-ws-reporter.ts

import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import WebSocket from 'ws';

export default class WebSocketReporter implements Reporter {
  private ws: WebSocket | null = null;
  private wsUrl: string;

  constructor(options: { url?: string } = {}) {
    this.wsUrl = options.url ?? 'ws://localhost:9100';
  }

  onBegin() {
    this.ws = new WebSocket(this.wsUrl);
  }

  private send(event: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  onTestBegin(test: TestCase) {
    this.send({
      type: 'e2e:start',
      browser: test.parent.project()?.name ?? 'unknown',
      test: test.title,
      timestamp: Date.now(),
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.send({
      type: 'e2e:end',
      browser: test.parent.project()?.name ?? 'unknown',
      test: test.title,
      status: result.status,
      duration: result.duration,
      error: result.errors?.[0]?.message,
    });

    // Send screenshot events
    for (const attachment of result.attachments) {
      if (attachment.contentType?.startsWith('image/')) {
        this.send({
          type: 'e2e:screenshot',
          test: test.title,
          path: attachment.path ?? '',
        });
      }
    }
  }

  onEnd(result: FullResult) {
    this.ws?.close();
  }
}
```

#### 1.5 Maestro File Watcher

```typescript
// packages/shared/test-harness/src/maestro/watcher.ts

import { watch } from 'chokidar';
import { readFile } from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import WebSocket from 'ws';

export class MaestroWatcher {
  private ws: WebSocket | null = null;
  private wsUrl: string;

  constructor(options: { url?: string } = {}) {
    this.wsUrl = options.url ?? 'ws://localhost:9100';
  }

  async watch(outputDir: string) {
    this.ws = new WebSocket(this.wsUrl);

    const watcher = watch(`${outputDir}/**/*.xml`, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('add', (path) => this.parseAndSend(path));
    watcher.on('change', (path) => this.parseAndSend(path));
  }

  private async parseAndSend(path: string) {
    try {
      const content = await readFile(path, 'utf-8');
      const result = await parseStringPromise(content);

      // Parse JUnit XML format from Maestro
      const testsuites = result.testsuites?.testsuite ?? [];
      for (const suite of testsuites) {
        const flowName = suite.$.name;
        const platform = path.includes('ios') ? 'ios' : 'android';

        this.send({
          type: 'mobile:flow:end',
          flow: flowName,
          platform,
          status: parseInt(suite.$.failures) === 0 ? 'passed' : 'failed',
          duration: parseFloat(suite.$.time) * 1000,
        });
      }
    } catch (err) {
      console.error('Failed to parse Maestro output:', err);
    }
  }

  private send(event: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  close() {
    this.ws?.close();
  }
}
```

### Phase 2: Dashboard UI

#### 2.1 Test Results Store

```typescript
// products/<product>/tester/dashboard/src/lib/stores/test-results.svelte.ts

import type { DashboardEvent, TestStatus, CoverageData } from '@resist/test-harness';

interface TestResult {
  name: string;
  suite: string;
  status: TestStatus;
  duration: number;
  error?: string;
}

interface E2EResult {
  name: string;
  browser: string;
  status: TestStatus;
  duration: number;
  error?: string;
  screenshots: string[];
}

interface MobileResult {
  flow: string;
  platform: 'ios' | 'android';
  status: TestStatus;
  duration: number;
}

interface BenchmarkResult {
  name: string;
  ops: number;
  margin: number;
  samples: number;
}

class TestResultsStore {
  unitTests = $state<TestResult[]>([]);
  e2eTests = $state<E2EResult[]>([]);
  mobileTests = $state<MobileResult[]>([]);
  benchmarks = $state<BenchmarkResult[]>([]);
  coverage = $state<CoverageData | null>(null);
  connected = $state(false);

  private ws: WebSocket | null = null;

  connect(url: string = 'ws://localhost:9100') {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onclose = () => {
      this.connected = false;
      // Reconnect after 2s
      setTimeout(() => this.connect(url), 2000);
    };

    this.ws.onmessage = (event) => {
      const data: DashboardEvent = JSON.parse(event.data);
      this.handleEvent(data);
    };
  }

  private handleEvent(event: DashboardEvent) {
    switch (event.type) {
      case 'test:end':
        this.unitTests = [
          ...this.unitTests.filter((t) => t.name !== event.test || t.suite !== event.suite),
          { name: event.test, suite: event.suite, status: event.status, duration: event.duration, error: event.error },
        ];
        break;

      case 'coverage':
        this.coverage = event.data;
        break;

      case 'e2e:end':
        this.e2eTests = [
          ...this.e2eTests.filter((t) => t.name !== event.test || t.browser !== event.browser),
          { name: event.test, browser: event.browser, status: event.status, duration: event.duration, error: event.error, screenshots: [] },
        ];
        break;

      case 'e2e:screenshot':
        this.e2eTests = this.e2eTests.map((t) =>
          t.name === event.test ? { ...t, screenshots: [...t.screenshots, event.path] } : t
        );
        break;

      case 'mobile:flow:end':
        this.mobileTests = [
          ...this.mobileTests.filter((t) => t.flow !== event.flow || t.platform !== event.platform),
          { flow: event.flow, platform: event.platform, status: event.status, duration: event.duration },
        ];
        break;

      case 'benchmark:result':
        this.benchmarks = [
          ...this.benchmarks.filter((b) => b.name !== event.name),
          { name: event.name, ops: event.ops, margin: event.margin, samples: event.samples },
        ];
        break;
    }
  }

  // Derived stats
  get unitStats() {
    const passed = this.unitTests.filter((t) => t.status === 'passed').length;
    const failed = this.unitTests.filter((t) => t.status === 'failed').length;
    const running = this.unitTests.filter((t) => t.status === 'running').length;
    return { passed, failed, running, total: this.unitTests.length };
  }

  get e2eStats() {
    const passed = this.e2eTests.filter((t) => t.status === 'passed').length;
    const failed = this.e2eTests.filter((t) => t.status === 'failed').length;
    return { passed, failed, total: this.e2eTests.length };
  }

  get mobileStats() {
    const passed = this.mobileTests.filter((t) => t.status === 'passed').length;
    const failed = this.mobileTests.filter((t) => t.status === 'failed').length;
    return { passed, failed, total: this.mobileTests.length };
  }

  clear() {
    this.unitTests = [];
    this.e2eTests = [];
    this.mobileTests = [];
    this.benchmarks = [];
    this.coverage = null;
  }
}

export const testResults = new TestResultsStore();
```

#### 2.2 Dashboard Summary Page

```svelte
<!-- products/<product>/tester/dashboard/src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { testResults } from '$lib/stores/test-results.svelte';

  onMount(() => {
    testResults.connect();
  });

  let unitStats = $derived(testResults.unitStats);
  let e2eStats = $derived(testResults.e2eStats);
  let mobileStats = $derived(testResults.mobileStats);
  let coverage = $derived(testResults.coverage);
  let connected = $derived(testResults.connected);
</script>

<div class="dashboard">
  <header>
    <h1>QA Dashboard</h1>
    <span class="status" class:connected>{connected ? 'Connected' : 'Disconnected'}</span>
  </header>

  <div class="grid">
    <a href="/unit" class="card">
      <h2>Unit Tests</h2>
      <div class="stats">
        <span class="passed">{unitStats.passed} passed</span>
        <span class="failed">{unitStats.failed} failed</span>
        {#if unitStats.running > 0}
          <span class="running">{unitStats.running} running</span>
        {/if}
      </div>
      <div class="total">{unitStats.total} total</div>
    </a>

    <a href="/e2e" class="card">
      <h2>E2E Web</h2>
      <div class="stats">
        <span class="passed">{e2eStats.passed} passed</span>
        <span class="failed">{e2eStats.failed} failed</span>
      </div>
      <div class="total">{e2eStats.total} total</div>
    </a>

    <a href="/mobile" class="card">
      <h2>Mobile E2E</h2>
      <div class="stats">
        <span class="passed">{mobileStats.passed} passed</span>
        <span class="failed">{mobileStats.failed} failed</span>
      </div>
      <div class="total">{mobileStats.total} total</div>
    </a>

    <a href="/bench" class="card">
      <h2>Benchmarks</h2>
      <div class="stats">
        <span>{testResults.benchmarks.length} benchmarks</span>
      </div>
    </a>

    <div class="card coverage">
      <h2>Coverage</h2>
      {#if coverage}
        <div class="coverage-grid">
          <div>
            <span class="label">Lines</span>
            <span class="pct">{coverage.lines.pct.toFixed(1)}%</span>
          </div>
          <div>
            <span class="label">Branches</span>
            <span class="pct">{coverage.branches.pct.toFixed(1)}%</span>
          </div>
          <div>
            <span class="label">Functions</span>
            <span class="pct">{coverage.functions.pct.toFixed(1)}%</span>
          </div>
          <div>
            <span class="label">Statements</span>
            <span class="pct">{coverage.statements.pct.toFixed(1)}%</span>
          </div>
        </div>
      {:else}
        <p class="no-data">No coverage data</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .dashboard {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 0.875rem;
  }

  .status.connected {
    background: #dcfce7;
    color: #166534;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.2s;
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .passed { color: #16a34a; }
  .failed { color: #dc2626; }
  .running { color: #ca8a04; }

  .total {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .coverage-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .coverage-grid div {
    display: flex;
    justify-content: space-between;
  }

  .label {
    color: #6b7280;
  }

  .pct {
    font-weight: 600;
  }

  .no-data {
    color: #9ca3af;
    font-style: italic;
  }
</style>
```

### Phase 3: Configuration

#### 3.1 Vitest Config (Unit Tests)

```typescript
// products/<product>/tester/unit/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: '../coverage',
    },
    reporters: [
      'default',
      ['@resist/test-harness/reporters/vitest-ws-reporter', { url: 'ws://localhost:9100' }],
    ],
  },
});
```

#### 3.2 Vitest Config (Benchmarks)

```typescript
// products/<product>/tester/bench/vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.bench.ts'],
    benchmark: {
      reporters: [
        'default',
        ['@resist/test-harness/reporters/vitest-ws-reporter', { url: 'ws://localhost:9100' }],
      ],
    },
  },
});
```

#### 3.3 Playwright Config

```typescript
// products/<product>/tester/e2e/web/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['@resist/test-harness/reporters/playwright-ws-reporter', { url: 'ws://localhost:9100' }],
  ],

  use: {
    baseURL: 'https://app.tastier.localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],

  // Visual regression
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
});
```

#### 3.4 Maestro Flows Example

```yaml
# products/<product>/tester/e2e/mobile/flows/login.yaml
appId: com.tastier.app
---
- launchApp

- tapOn: "Sign In"

- tapOn:
    id: "email-input"
- inputText: "test@example.com"

- tapOn:
    id: "password-input"
- inputText: "password123"

- tapOn: "Submit"

- assertVisible: "Welcome back"
```

### Phase 4: Package Scripts

#### 4.1 Root package.json

```json
{
  "scripts": {
    "test": "turbo test --",
    "test:unit": "turbo test:unit --",
    "test:e2e": "turbo test:e2e --",
    "test:mobile": "turbo test:mobile --",
    "bench": "turbo bench --",
    "test:dashboard": "turbo test:dashboard --"
  }
}
```

#### 4.2 Product tester/package.json

```json
{
  "name": "@resist/tastier-tester",
  "scripts": {
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run --config unit/vitest.config.ts",
    "test:unit:watch": "vitest --config unit/vitest.config.ts",
    "test:unit:coverage": "vitest run --config unit/vitest.config.ts --coverage",
    "test:e2e": "playwright test --config e2e/web/playwright.config.ts",
    "test:e2e:ui": "playwright test --config e2e/web/playwright.config.ts --ui",
    "test:mobile": "maestro test e2e/mobile/flows/ --format junit --output maestro-results/",
    "test:mobile:ios": "maestro test e2e/mobile/flows/ --platform ios --format junit --output maestro-results/",
    "test:mobile:android": "maestro test e2e/mobile/flows/ --platform android --format junit --output maestro-results/",
    "bench": "vitest bench --config bench/vitest.config.ts",
    "dashboard": "pnpm --filter @resist/test-harness server & vite dev",
    "dashboard:server": "pnpm --filter @resist/test-harness server"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@resist/test-harness": "workspace:*",
    "vitest": "^1.0.0"
  }
}
```

### Phase 5: CI Integration

#### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm test:unit --coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  e2e-mobile:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - run: pnpm install
      - run: pnpm build --filter=@resist/tastier-app

      # iOS Simulator
      - name: Boot iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15"
          xcrun simctl install booted packages/products/tastier/app/ios/build/Tastier.app

      - run: pnpm test:mobile:ios

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: maestro-results
          path: maestro-results/

  bench:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm bench

      # Optional: Comment benchmark results on PR
      - uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'vitest'
          output-file-path: bench-results.json
          comment-on-alert: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Phase 6: Local Dev Integration

#### 6.1 Add to local-dev.ts

```typescript
// packages/shared/config/src/local-dev.ts

export const LOCAL_DEV = {
  products: {
    tastier: {
      api: { host: 'api.tastier.localhost', port: 3001 },
      app: { host: 'app.tastier.localhost', port: 3000 },
      status: { host: 'status.tastier.localhost', port: 3002 },
      assets: { host: 'assets.tastier.localhost', port: 3003 },
      marketing: { host: 'tastier.localhost', port: 3004 },
      qa: { host: 'qa.tastier.localhost', port: 3010 },  // <-- Dashboard
    },
    // ...
  },
  admin: { host: 'admin.localhost', port: 9001 },
} as const;
```

#### 6.2 Turbo tasks

```json
// turbo.json (additions)
{
  "tasks": {
    "test:unit": { /* existing */ },
    "test:e2e": { /* existing */ },
    "test:mobile": {
      "dependsOn": ["build"],
      "cache": false
    },
    "test:dashboard": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## Summary

| Component | Tool | Real-time | CI Ready |
|-----------|------|-----------|----------|
| Unit Tests | Vitest | ✓ WebSocket reporter | ✓ |
| Coverage | Vitest + v8 | ✓ via reporter | ✓ Codecov |
| Benchmarks | Vitest bench | ✓ WebSocket reporter | ✓ |
| E2E Web | Playwright | ✓ WebSocket reporter | ✓ |
| E2E Mobile | Maestro | ✓ File watcher | ✓ (macos runner) |
| Dashboard | SvelteKit | ✓ Native | Local only |

## Implementation Order

1. **Week 1**: Core infrastructure (WebSocket server, event types, Vitest reporter)
2. **Week 2**: Playwright reporter, Maestro watcher, basic dashboard UI
3. **Week 3**: Dashboard polish, coverage visualization, screenshot diffs
4. **Week 4**: CI integration, benchmark tracking, documentation
