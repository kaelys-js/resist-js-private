import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

function safeFile(p: string) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function safeRead(p: string) {
    try {
        return fs.readFileSync(p, "utf8");
    } catch {
        return null;
    }
}

/* ============================================================================
   GIT INFO COLLECTOR
============================================================================ */

export function getGitInfo() {
    // If git is not installed or not in a repo
    const hasGit = !!safe("which git") || !!safe("git --version");
    const isRepo = !!safe("git rev-parse --is-inside-work-tree");

    if (!hasGit || !isRepo) {
        return {
            installed: hasGit,
            inRepository: isRepo,
        };
    }

    const root = safe("git rev-parse --show-toplevel");

    /* -------------------------------------------------------------
       Basic Repo State
    ------------------------------------------------------------- */
    const version = safe("git --version");
    const branch = safe("git rev-parse --abbrev-ref HEAD");
    const headCommit = safe("git rev-parse HEAD");
    const isDetachedHead = branch === "HEAD";

    /* -------------------------------------------------------------
       Status
    ------------------------------------------------------------- */
    const statusPorcelain = safe("git status --porcelain=v1 --untracked-files=all");
    const isDirty = !!statusPorcelain;
    const stagedFiles = safe("git diff --name-only --cached");
    const unstagedFiles = safe("git diff --name-only");
    const untrackedFiles = safe("git ls-files --others --exclude-standard");

    /* -------------------------------------------------------------
       Repo Metadata
    ------------------------------------------------------------- */
    const remotes = safe("git remote -v");
    const tags = safe("git tag --list");
    const branches = safe("git branch --list");
    const worktrees = safe("git worktree list");
    const stashes = safe("git stash list");

    /* -------------------------------------------------------------
       Submodules
    ------------------------------------------------------------- */
    const hasSubmodules = safeFile(path.join(root!, ".gitmodules"));
    const submodules = hasSubmodules ? safeRead(path.join(root!, ".gitmodules")) : null;

    /* -------------------------------------------------------------
       LFS
    ------------------------------------------------------------- */
    const lfsInstalled = !!safe("git lfs version");
    const lfsTracking = safe("git lfs track");

    /* -------------------------------------------------------------
       Git Config (scrubbed)
       Secrets are NOT printed; only keys exist.
    ------------------------------------------------------------- */
    const localConfig = safe("git config --local --list");
    const globalConfig = safe("git config --global --list");
    const systemConfig = safe("git config --system --list");

    /* -------------------------------------------------------------
       Special states: merge, rebase, cherry-pick, etc.
    ------------------------------------------------------------- */
    const gitDir = safe("git rev-parse --git-dir");

    const mergeInProgress =
        safeFile(path.join(gitDir!, "MERGE_HEAD")) ||
        safeFile(path.join(gitDir!, "MERGE_MSG"));

    const rebaseInProgress =
        safeFile(path.join(gitDir!, "rebase-apply")) ||
        safeFile(path.join(gitDir!, "rebase-merge"));

    const cherryPickInProgress = safeFile(path.join(gitDir!, "CHERRY_PICK_HEAD"));

    const bisectInProgress = safeFile(path.join(gitDir!, "BISECT_LOG"));

    /* -------------------------------------------------------------
       Ignore Rules
    ------------------------------------------------------------- */
    const gitignore = safeFile(path.join(root!, ".gitignore"))
        ? safeRead(path.join(root!, ".gitignore"))
        : null;

    const gitattributes = safeFile(path.join(root!, ".gitattributes"))
        ? safeRead(path.join(root!, ".gitattributes"))
        : null;

    const blameIgnore = safeFile(path.join(root!, ".git-blame-ignore-revs"))
        ? safeRead(path.join(root!, ".git-blame-ignore-revs"))
        : null;

    /* -------------------------------------------------------------
       Hooks (including Husky)
    ------------------------------------------------------------- */
    const hooksDir = path.join(gitDir!, "hooks");
    let hooks: string[] = [];

    try {
        if (fs.existsSync(hooksDir))
            hooks = fs.readdirSync(hooksDir);
    } catch {}

    const huskyDir = path.join(root!, ".husky");
    const huskyHooks =
        safeFile(huskyDir) && fs.lstatSync(huskyDir).isDirectory()
            ? fs.readdirSync(huskyDir)
            : [];

    /* -------------------------------------------------------------
       Final structured output
    ------------------------------------------------------------- */
    return {
        installed: hasGit,
        inRepository: true,
        root,
        version,
        head: {
            branch,
            commit: headCommit,
            detached: isDetachedHead
        },
        status: {
            dirty: isDirty,
            stagedFiles: stagedFiles?.split("\n").filter(Boolean) ?? [],
            unstagedFiles: unstagedFiles?.split("\n").filter(Boolean) ?? [],
            untrackedFiles: untrackedFiles?.split("\n").filter(Boolean) ?? [],
            porcelain: statusPorcelain?.split("\n").filter(Boolean) ?? []
        },
        remotes: remotes?.split("\n").filter(Boolean) ?? [],
        branches: branches?.split("\n").filter(Boolean) ?? [],
        tags: tags?.split("\n").filter(Boolean) ?? [],
        worktrees: worktrees?.split("\n").filter(Boolean) ?? [],
        stashes: stashes?.split("\n").filter(Boolean) ?? [],
        submodules: hasSubmodules ? submodules : null,
        lfs: {
            installed: lfsInstalled,
            tracked: lfsTracking
        },
        config: {
            local: localConfig?.split("\n") ?? [],
            global: globalConfig?.split("\n") ?? [],
            system: systemConfig?.split("\n") ?? []
        },
        states: {
            merging: !!mergeInProgress,
            rebasing: !!rebaseInProgress,
            cherryPick: !!cherryPickInProgress,
            bisect: !!bisectInProgress
        },
        ignores: {
            gitignore,
            gitattributes,
            blameIgnore
        },
        hooks: {
            gitHooks: hooks,
            huskyHooks
        }
    };
}