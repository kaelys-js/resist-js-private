import os from "os";
import process from "process";

/* ============================================================
   DETECT COLOR / UTF / TTY CAPABILITIES
============================================================ */
function getTerminalCapabilities() {
    const env = process.env;

    const truecolor =
        env.COLORTERM === "truecolor" ||
        env.TERM_PROGRAM === "Apple_Terminal" ||
        env.TERM === "xterm-256color" ||
        env.TERM?.includes("256") ||
        env.COLORTERM?.includes("truecolor");

    const color256 =
        env.TERM?.includes("256") ||
        env.TERM?.includes("xterm") ||
        env.COLORTERM;

    const utf8 =
        env.LANG?.toLowerCase().includes("utf") ||
        env.LC_ALL?.toLowerCase().includes("utf");

    return {
        isTTY: process.stdout.isTTY ?? false,
        supports256: !!color256,
        supportsTruecolor: !!truecolor,
        supportsUnicode: !!utf8,
        envTERM: env.TERM ?? null,
        envCOLORTERM: env.COLORTERM ?? null
    };
}

/* ============================================================
   DETECT SHELL
============================================================ */
function detectShell(env: NodeJS.ProcessEnv) {
    const shell = env.SHELL ?? env.COMSPEC ?? null;

    return {
        shell,
        shellName: shell ? shell.split("/").pop() : null,
        isBash: shell?.includes("bash") ?? false,
        isZsh: shell?.includes("zsh") ?? false,
        isFish: shell?.includes("fish") ?? false,
        isSh: shell?.endsWith("/sh") ?? false,
        isPowershell: shell?.toLowerCase().includes("powershell") ?? false,
        isCmd: shell?.toLowerCase().includes("cmd.exe") ?? false
    };
}

/* ============================================================
   DETECT LOCAL TERMINAL EMULATOR
============================================================ */
function detectTerminalProgram(env: NodeJS.ProcessEnv) {
    const termProgram = env.TERM_PROGRAM ?? null;

    if (env.WARP_IS_LOCAL_SHELL === "1") return "Warp";
    if (env.GHOSTTY_SHELL_INTEGRATION) return "Ghostty";
    if (termProgram === "iTerm.app") return "iTerm2";
    if (termProgram === "Apple_Terminal") return "macOS Terminal";
    if (termProgram === "Hyper") return "Hyper";
    if (termProgram === "WezTerm") return "WezTerm";
    if (env.KITTY_WINDOW_ID) return "kitty";
    if (env.ALACRITTY_SOCKET) return "Alacritty";
    if (env.WT_SESSION) return "Windows Terminal";

    return termProgram ?? "Unknown";
}

/* ============================================================
   DETECT IDE-INTEGRATED TERMINALS
============================================================ */
function detectEmbeddedIDE(env: NodeJS.ProcessEnv) {
    return {
        isVSCode: env.TERM_PROGRAM === "vscode",
        isCursor: !!env.CURSOR_TRACE_ID,
        isJetBrains: !!env.IDEA_INITIAL_DIRECTORY,
        isZed: !!env.ZED_TERMINAL,
        isReplit: !!env.REPL_ID,
        isStackBlitz: !!env.WEB_CONTAINER_API,
        isGitpod: !!env.GITPOD_TASK_ID,
        isCodespaces: env.CODESPACES === "true"
    };
}

/* ============================================================
   REMOTE TERMINALS
============================================================ */
function detectRemote(env: NodeJS.ProcessEnv) {
    return {
        viaSSH: !!env.SSH_CONNECTION || !!env.SSH_CLIENT,
        viaMosh: !!env.MOSH_CONNECTION,
        viaTmux: !!env.TMUX,
        viaScreen: !!env.STY,
        viaWSL: !!env.WSL_DISTRO_NAME,
        viaTailscaleSSH: !!env.TS_SSH
    };
}

/* ============================================================
   CLOUD TERMINALS
============================================================ */
function detectCloudShell(env: NodeJS.ProcessEnv) {
    return {
        aws: !!env.AWS_CLI_HISTORY_FILE || !!env.AWS_EXECUTION_ENV?.includes("CloudShell"),
        gcp: !!env.CLOUD_SHELL || !!env.DEVSHELL_CLIENT_PORT,
        azure: !!env.ACC_CLOUD || !!env.AZURE_HTTP_USER_AGENT?.includes("cloud shell")
    };
}

/* ============================================================
   MAIN EXPORT
============================================================ */
export function getTerminalInfo() {
    const env = process.env;

    return {
        program: detectTerminalProgram(env),
        shell: detectShell(env),

        capabilities: getTerminalCapabilities(),

        embeddedIDE: detectEmbeddedIDE(env),
        remote: detectRemote(env),
        cloud: detectCloudShell(env),

        environment: {
            TERM: env.TERM ?? null,
            TERM_PROGRAM: env.TERM_PROGRAM ?? null,
            COLORTERM: env.COLORTERM ?? null,
            LANG: env.LANG ?? null,
            LC_ALL: env.LC_ALL ?? null,
            PWD: env.PWD ?? null,
            HOME: env.HOME ?? null
        },

        session: {
            pid: process.pid,
            ppid: process.ppid,
            uid: process.getuid?.() ?? null,
            gid: process.getgid?.() ?? null,
            platform: process.platform,
            arch: process.arch,
            cpu: os.cpus()?.[0]?.model ?? null
        }
    };
}

console.log(getTerminalInfo())