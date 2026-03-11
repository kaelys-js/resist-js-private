import fs from "fs";
import path from "path";

export function getHuskyInfo(cwd: string = process.cwd()) {
    const pkgPath = path.join(cwd, "package.json");
    let pkg: any = null;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } catch {}

    const huskyDir = path.join(cwd, ".husky");
    const exists = fs.existsSync(huskyDir);

    const hooks: Record<string, any> = {};

    if (exists) {
        const hookFiles = fs.readdirSync(huskyDir).filter(f =>
            !f.startsWith("_") &&
            !f.endsWith(".md") &&
            f !== ".gitignore"
        );

        for (const file of hookFiles) {
            const full = path.join(huskyDir, file);
            try {
                const content = fs.readFileSync(full, "utf8");
                hooks[file] = {
                    file,
                    path: full,
                    size: content.length,
                    shebang: content.startsWith("#!"),
                    commands: content
                        .split("\n")
                        .filter(Boolean)
                        .filter((line) => !line.startsWith("#"))
                };
            } catch {
                hooks[file] = { error: "unable to read file" };
            }
        }
    }

    // Detect Husky presence in package.json
    const pkgHuskyConfig = pkg?.husky ?? null;

    // Detect install type
    const prepareScript = pkg?.scripts?.prepare ?? null;
    const hasHookInstall = Boolean(
        prepareScript?.includes("husky install") ||
        prepareScript?.includes("pinst")
    );

    // Detect package manager integration
    const pm = pkg?.packageManager ?? null;

    return {
        exists,
        directory: exists ? huskyDir : null,

        // Hooks present in .husky/*
        hooks,
        hookCount: Object.keys(hooks).length,

        // From package.json
        packageJsonConfig: pkgHuskyConfig,

        // How Husky is installed
        prepareScript,
        hasHookInstall,

        // Version estimation logic
        detectedVersion: (() => {
            if (!exists && !pkgHuskyConfig) return null;
            if (pkgHuskyConfig) return "v4 (package.json config)";
            if (exists) {
                // v7+ has stand-alone hook files with #!/bin/sh scripts
                return "v7+ (directory hooks)";
            }
            return "unknown";
        })(),

        // Package manager info
        packageManager: pm,
    };
}