import fs from "fs";
import path from "path";

function safeReadJSON(file: string) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return null;
    }
}

function safeReadYAML(file: string) {
    try {
        const content = fs.readFileSync(file, "utf8");
        const yaml = require("yaml");
        return yaml.parse(content);
    } catch {
        return null;
    }
}

export function getAllContributorsInfo(cwd: string = process.cwd()) {
    const filenames = [
        ".all-contributorsrc",
        ".all-contributorsrc.json",
        ".all-contributorsrc.yml",
        ".all-contributorsrc.yaml"
    ];

    let filePath: string | null = null;
    let data: any = null;

    for (const name of filenames) {
        const full = path.join(cwd, name);
        if (fs.existsSync(full)) {
            filePath = full;

            if (name.endsWith(".yml") || name.endsWith(".yaml")) {
                data = safeReadYAML(full);
            } else {
                data = safeReadJSON(full);
            }
            break;
        }
    }

    if (!filePath || !data) {
        return {
            exists: false,
            path: null,
            raw: null,
            contributors: [],
            contributorCount: 0
        };
    }

    const contributors = Array.isArray(data.contributors)
        ? data.contributors.map((c: any) => ({
              login: c.login ?? null,
              name: c.name ?? null,
              avatar_url: c.avatar_url ?? null,
              profile: c.profile ?? null,
              contributions: Array.isArray(c.contributions) ? c.contributions : []
          }))
        : [];

    return {
        exists: true,
        path: filePath,
        schemaVersion: data.schemaVersion ?? null,
        projectName: data.projectName ?? null,
        projectOwner: data.projectOwner ?? null,
        repoType: data.repoType ?? null,
        repoHost: data.repoHost ?? null,
        files: data.files ?? [],
        badges: data.badges ?? [],
        contributorsPerLine: data.contributorsPerLine ?? null,
        skipCi: data.skipCi ?? null,
        commit: data.commit ?? null,
        contributors,
        contributorCount: contributors.length,
        raw: data
    };
}