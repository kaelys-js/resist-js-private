import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

function safeRead(p: string) {
    try {
        return fs.readFileSync(p, "utf8");
    } catch {
        return null;
    }
}

export function getGitHubInfo() {
    const env = process.env;

    /* ============================================================
       1. CORE SIGNALS
    ============================================================ */

    const inActions = !!env.GITHUB_ACTIONS;
    const inCodespaces = !!env.CODESPACES;
    const hasGhCLI = !!safe("which gh");
    const inGithubDesktop =
        env.GITHUB_DESKTOP_REPOSITORY || env.GITHUB_DESKTOP_PORTABLE;

    /* ============================================================
       2. REPOSITORY CONTEXT
    ============================================================ */

    const repo = env.GITHUB_REPOSITORY ?? null;
    const repoOwner = env.GITHUB_REPOSITORY_OWNER ?? null;
    const workflow = env.GITHUB_WORKFLOW ?? null;
    const eventName = env.GITHUB_EVENT_NAME ?? null;
    const runId = env.GITHUB_RUN_ID ?? null;
    const serverURL = env.GITHUB_SERVER_URL ?? "https://github.com";

    /* ============================================================
       3. GITHUB EVENT PAYLOAD
    ============================================================ */

    const eventPayloadPath = env.GITHUB_EVENT_PATH ?? null;
    const eventPayload = eventPayloadPath ? safeRead(eventPayloadPath) : null;

    /* ============================================================
       4. BRANCH / PR CONTEXT
    ============================================================ */

    const ref = env.GITHUB_REF ?? null;
    const refName = env.GITHUB_REF_NAME ?? null;
    const refType = env.GITHUB_REF_TYPE ?? null;
    const sha = env.GITHUB_SHA ?? null;
    const actor = env.GITHUB_ACTOR ?? null;

    /* ============================================================
       5. RUNNER INFO
    ============================================================ */

    const runner = {
        os: env.RUNNER_OS ?? null,
        arch: env.RUNNER_ARCH ?? null,
        temp: env.RUNNER_TEMP ?? null,
        toolCache: env.RUNNER_TOOL_CACHE ?? null,
        workspace: env.GITHUB_WORKSPACE ?? null,
        debug: env.ACTIONS_STEP_DEBUG === "true",
    };

    /* ============================================================
       6. CODESPACES INFO
    ============================================================ */

    const codespaces = inCodespaces
        ? {
            name: env.CODESPACE_NAME,
            machine: env.CODESPACES_MACHINE_NAME,
            user: env.GITHUB_USER ?? null,
            repoUrl: env.GITHUB_REPOSITORY
                ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`
                : null,
        }
        : null;

    /* ============================================================
       7. GITHUB CLI (gh) INFO
    ============================================================ */

    const gh = hasGhCLI
        ? {
            installed: true,
            version: safe("gh --version"),
            authStatus: safe("gh auth status") ?? null,
            currentUser: safe("gh api user --jq .login") ?? null,
        }
        : {
            installed: false,
        };

    /* ============================================================
       8. GH PACKAGE REGISTRY INFO
    ============================================================ */

    const ghPackages = {
        npmRegistry:
            env.NPM_CONFIG_REGISTRY?.includes("npm.pkg.github.com") ?? false,
        dockerRegistry:
            env.GITHUB_REGISTRY?.includes("ghcr.io") ||
            safe("docker info 2>/dev/null | grep ghcr.io") != null,
    };

    /* ============================================================
       9. TOKEN DETECTION (SAFE — NEVER EXPOSE TOKEN)
    ============================================================ */

    const tokens = {
        githubTokenPresent: !!env.GITHUB_TOKEN,
        personalToken:
            !!env.GH_TOKEN || !!env.GITHUB_PAT || !!env.PERSONAL_ACCESS_TOKEN,
    };

    /* ============================================================
       10. WORKFLOW + JOB + MATRIX DETAILS
    ============================================================ */

    const workflowInfo = {
        workflow,
        job: env.GITHUB_JOB ?? null,
        action: env.GITHUB_ACTION ?? null,
        runNumber: env.GITHUB_RUN_NUMBER ?? null,
        runAttempt: env.GITHUB_RUN_ATTEMPT ?? null,
        eventName,
        eventPayload,
    };

    /* ============================================================
       11. FINAL STRUCTURED OUTPUT
    ============================================================ */

    return {
        detected: inActions || inCodespaces || inGithubDesktop || hasGhCLI,
        inActions,
        inCodespaces,
        inGithubDesktop: !!inGithubDesktop,
        hasGhCLI,
        repoContext: {
            repository: repo,
            owner: repoOwner,
            serverURL,
            ref,
            refName,
            refType,
            sha,
            actor,
        },
        workflow: workflowInfo,
        runner,
        codespaces,
        githubCLI: gh,
        packages: ghPackages,
        tokens,
    };
}