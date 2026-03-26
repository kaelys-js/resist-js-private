import fs from "fs";

/* ========================================================================
   SAFE HELPERS
======================================================================== */
function safeEnv(env: Record<string, string | undefined>, key: string) {
    return env[key] ?? null;
}

export function getGitLabInfo() {
    const env = process.env;

    const inCI = env.GITLAB_CI === "true";
    const inWebIDE = !!env.GITLAB_WORKSPACE_ID;
    const isGitLab = inCI || inWebIDE || !!env.CI_PROJECT_URL;

    if (!isGitLab) {
        return {
            detected: false,
            inCI: false,
            inWebIDE: false,
        };
    }

    /* ========================================================================
       1. BASIC METADATA
    ======================================================================== */
    const project = {
        id: safeEnv(env, "CI_PROJECT_ID"),
        name: safeEnv(env, "CI_PROJECT_NAME"),
        namespace: safeEnv(env, "CI_PROJECT_NAMESPACE"),
        path: safeEnv(env, "CI_PROJECT_PATH"),
        description: safeEnv(env, "CI_PROJECT_DESCRIPTION"),
        url: safeEnv(env, "CI_PROJECT_URL"),
        dir: safeEnv(env, "CI_PROJECT_DIR"),
        visibility: safeEnv(env, "CI_PROJECT_VISIBILITY"),
        createdAt: safeEnv(env, "CI_PROJECT_CREATED_AT"),
    };

    /* ========================================================================
       2. REPOSITORY
    ======================================================================== */
    const repo = {
        gitSSH: safeEnv(env, "CI_REPOSITORY_URL"),
        gitHTTP: safeEnv(env, "CI_HTTP_REPOSITORY_URL"),
        defaultBranch: safeEnv(env, "CI_DEFAULT_BRANCH"),
        commitSHA: safeEnv(env, "CI_COMMIT_SHA"),
        commitShortSHA: safeEnv(env, "CI_COMMIT_SHORT_SHA"),
        commitBranch: safeEnv(env, "CI_COMMIT_BRANCH"),
        commitTag: safeEnv(env, "CI_COMMIT_TAG"),
        commitRefName: safeEnv(env, "CI_COMMIT_REF_NAME"),
        commitTitle: safeEnv(env, "CI_COMMIT_TITLE"),
        commitMessage: safeEnv(env, "CI_COMMIT_MESSAGE"),
        commitDescription: safeEnv(env, "CI_COMMIT_DESCRIPTION"),
        commitAuthor: {
            name: safeEnv(env, "CI_COMMIT_AUTHOR"),
            email: safeEnv(env, "CI_COMMIT_AUTHOR_EMAIL"),
        },
        pipelineSource: safeEnv(env, "CI_PIPELINE_SOURCE"),
        mergeRequest: {
            id: safeEnv(env, "CI_MERGE_REQUEST_ID"),
            iid: safeEnv(env, "CI_MERGE_REQUEST_IID"),
            refPath: safeEnv(env, "CI_MERGE_REQUEST_REF_PATH"),
            projectId: safeEnv(env, "CI_MERGE_REQUEST_PROJECT_ID"),
            sourceBranch: safeEnv(env, "CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"),
            targetBranch: safeEnv(env, "CI_MERGE_REQUEST_TARGET_BRANCH_NAME"),
            title: safeEnv(env, "CI_MERGE_REQUEST_TITLE"),
            author: safeEnv(env, "CI_MERGE_REQUEST_AUTHOR"),
        },
    };

    /* ========================================================================
       3. PIPELINE INFO
    ======================================================================== */
    const pipeline = {
        id: safeEnv(env, "CI_PIPELINE_ID"),
        iid: safeEnv(env, "CI_PIPELINE_IID"),
        url: safeEnv(env, "CI_PIPELINE_URL"),
        createdAt: safeEnv(env, "CI_PIPELINE_CREATED_AT"),
        modifiedAt: safeEnv(env, "CI_PIPELINE_MODIFIED_AT"),
        retry: safeEnv(env, "CI_PIPELINE_RETRY"),
        source: safeEnv(env, "CI_PIPELINE_SOURCE"),
        configPath: safeEnv(env, "CI_CONFIG_PATH"),
        yamlErrors: safeEnv(env, "CI_YAML_ERRORS"),
    };

    /* ========================================================================
       4. USER INFO
    ======================================================================== */
    const user = {
        id: safeEnv(env, "GITLAB_USER_ID"),
        login: safeEnv(env, "GITLAB_USER_LOGIN"),
        email: safeEnv(env, "GITLAB_USER_EMAIL"),
        name: safeEnv(env, "GITLAB_USER_NAME"),
        avatar: safeEnv(env, "GITLAB_USER_AVATAR_URL"),
    };

    /* ========================================================================
       5. JOB INFO
    ======================================================================== */
    const job = {
        id: safeEnv(env, "CI_JOB_ID"),
        name: safeEnv(env, "CI_JOB_NAME"),
        stage: safeEnv(env, "CI_JOB_STAGE"),
        url: safeEnv(env, "CI_JOB_URL"),
        tokenPresent: !!env.CI_JOB_TOKEN,
        attempt: safeEnv(env, "CI_JOB_ATTEMPT"),
        manual: safeEnv(env, "CI_JOB_MANUAL"),
        artifactExpireIn: safeEnv(env, "CI_JOB_ARTIFACT_EXPIRE_IN"),
        allowFailure: safeEnv(env, "CI_JOB_ALLOW_FAILURE"),
    };

    /* ========================================================================
       6. RUNNER INFO
    ======================================================================== */
    const runner = {
        id: safeEnv(env, "CI_RUNNER_ID"),
        description: safeEnv(env, "CI_RUNNER_DESCRIPTION"),
        tags: safeEnv(env, "CI_RUNNER_TAGS")?.split(",") ?? null,
        executor: safeEnv(env, "CI_RUNNER_EXECUTOR"),
        architecture: safeEnv(env, "CI_RUNNER_ARCH"),
        version: safeEnv(env, "CI_RUNNER_VERSION"),
        revision: safeEnv(env, "CI_RUNNER_REVISION"),
    };

    /* ========================================================================
       7. VARIABLES & ENVIRONMENT
    ======================================================================== */
    const environment = {
        name: safeEnv(env, "CI_ENVIRONMENT_NAME"),
        action: safeEnv(env, "CI_ENVIRONMENT_ACTION"),
        url: safeEnv(env, "CI_ENVIRONMENT_URL"),
        slug: safeEnv(env, "CI_ENVIRONMENT_SLUG"),
    };

    /* ========================================================================
       8. SERVICES (DATABASES, REGISTRIES, ETC.)
    ======================================================================== */
    const services = {
        postgres: {
            enabled: !!env.POSTGRES_DB || !!env.POSTGRES_USER,
            db: safeEnv(env, "POSTGRES_DB"),
            user: safeEnv(env, "POSTGRES_USER"),
            host: safeEnv(env, "POSTGRES_HOST"),
        },
        mysql: {
            enabled: !!env.MYSQL_DATABASE || !!env.MYSQL_USER,
            db: safeEnv(env, "MYSQL_DATABASE"),
            user: safeEnv(env, "MYSQL_USER"),
            host: safeEnv(env, "MYSQL_HOST"),
        },
        dockerRegistry: safeEnv(env, "CI_REGISTRY"),
        dockerImage: safeEnv(env, "CI_REGISTRY_IMAGE"),
    };

    /* ========================================================================
       9. GITLAB PAGES
    ======================================================================== */
    const pages = {
        enabled: !!env.CI_PAGES_URL,
        url: safeEnv(env, "CI_PAGES_URL"),
        domain: safeEnv(env, "CI_PAGES_DOMAIN"),
    };

    /* ========================================================================
       10. GITLAB AGENT (KUBERNETES)
    ======================================================================== */
    const kubernetes = {
        agentId: safeEnv(env, "CI_AGENT_ID"),
        configPath: safeEnv(env, "CI_KUBERNETES_ACTIVE_CONFIGURATION"),
    };

    /* ========================================================================
       11. FINAL STRUCTURED OUTPUT
    ======================================================================== */
    return {
        detected: true,
        inCI,
        inWebIDE,
        gitlabBaseDomain: safeEnv(env, "CI_SERVER_URL") ?? "https://gitlab.com",
        gitlabVersion: safeEnv(env, "CI_SERVER_VERSION"),
        project,
        repo,
        pipeline,
        job,
        runner,
        user,
        environment,
        services,
        pages,
        kubernetes,
        tokens: {
            jobTokenPresent: !!env.CI_JOB_TOKEN,
            registryTokenPresent: !!env.CI_REGISTRY_PASSWORD,
            deployTokenPresent: !!env.CI_DEPLOY_PASSWORD,
        },
    };
}