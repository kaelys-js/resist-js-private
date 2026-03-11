# devenv

Set up local and remote dev environments with one command. Automates prerequisite installation, container building, VPS provisioning, and Coder deployment.

## Usage

```
pnpm tool devenv <action> [flags]
```

### Actions

| Action | Description |
|--------|-------------|
| `up` | Set up local dev container (installs prerequisites, builds, starts) |
| `down` | Stop and remove local dev container |
| `deploy` | Provision VPS + Coder from scratch (fully automated) |
| `destroy` | Tear down remote infrastructure (requires --confirm) |
| `push` | Push updated Coder template after config change |
| `status` | Show environment setup status (default) |
| `exec` | Execute a command inside the running dev container |
| `restart` | Stop then re-start the local dev container |
| `logs` | Stream logs from the running dev container |
| `ssh` | SSH into the remote Coder workspace |
| `stop` | Stop the remote Coder workspace without destroying it |
| `start` | Start a previously stopped remote Coder workspace |
| `prebuild` | Prebuild the dev container image for faster startup |
| `env` | Generate `.env` file from Infisical secrets |

## Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--dry-run` | `-n` | `boolean` | Preview what would happen without executing |
| `--force` | `-F` | `boolean` | Re-prompt for saved deployment config |
| `--rebuild` | `-R` | `boolean` | Force rebuild of the container image |
| `--image-only` | — | `boolean` | Only rebuild and push the workspace image |
| `--prune` | — | `boolean` | Also remove Docker images when stopping the container |
| `--confirm` | — | `boolean` | Confirm destructive operations (required for destroy) |

## How It Works

### `devenv up` (Local Dev Container)

1. Checks prerequisites: mise, Docker, devcontainer CLI
2. Auto-installs missing tools (devcontainer CLI via npm; Docker prints install instructions)
3. Detects if `resist.config.ts` has changed since last build — warns if so
4. Runs `sync` if `.devcontainer/` doesn't exist (generates templates)
5. Builds and starts the dev container via `devcontainer up`
6. Container runs `post-create.sh` which installs mise tools, project deps, and onboarding
7. Optionally auto-opens VS Code (if `autoOpen: true` in config)

### `devenv down` (Local Teardown)

1. Finds running container by devcontainer label
2. Stops and removes the container
3. Optionally prunes related Docker images (with `--prune`)

### `devenv deploy` (Remote VPS + Coder)

1. Checks prerequisites: all local prereqs + hcloud, kubectl, helm, coder CLI, terraform, cloudflared
2. Auto-installs missing tools via mise or curl (versions from `SystemToolVersionsSchema` config)
3. Validates SSH key exists with correct permissions (700/600)
4. Prompts for API tokens (Hetzner, Cloudflare, GitHub OAuth) — saved to `.devenv.json`
5. Provisions Hetzner VPS (configurable server type and location via `CoderSchema`)
6. Installs k3s on VPS via SSH
7. Installs Coder via Helm chart
8. Installs Infisical via Helm chart
9. Configures DNS + TLS via Cloudflare Tunnel
10. Builds and pushes workspace Docker image to configured container registry
11. Pushes Coder workspace template (with per-service Coder apps)
12. Creates first workspace
13. Saves infrastructure state to `.devenv-state.json` after each step

All steps are idempotent — running twice skips completed steps.

### `devenv destroy` (Remote Teardown)

1. Reads infrastructure state from `.devenv-state.json`
2. Shows preview of which resources will be destroyed
3. Requires `--confirm` flag to proceed
4. Destroys only resources that state indicates were created
5. Each step is fault-tolerant — continues even if a resource is already deleted

### `devenv exec` (Container Shell)

Executes a command inside the running dev container. Defaults to `/bin/bash` if no command specified.

### `devenv restart` (Container Restart)

Stops the local container, re-checks prerequisites, re-syncs config, and starts a fresh container.

### `devenv logs` (Container Logs)

Streams logs from the running dev container. Supports `--follow` and `--tail` flags.

### `devenv ssh` (Remote SSH)

Opens an SSH session to the remote Coder workspace via `coder ssh`.

### `devenv stop` / `devenv start` (Remote Lifecycle)

Stops or starts the remote Coder workspace without destroying infrastructure.

### `devenv prebuild` (Image Cache)

Prebuilds the dev container image for faster startup via `devcontainer build`.

### `devenv env` (Secrets Export)

Generates a `.env` file from Infisical secrets for local development via `infisical export`.

### `devenv push` (Update Template)

Quick push of updated Coder template after config changes:
1. Verifies coder CLI is installed and authenticated
2. Pushes `.coder/` directory as Coder template

### `devenv status` (Environment Report)

Checks all prerequisites and prints a color-coded status table:
- **LOCAL**: mise, Docker, devcontainer CLI versions
- **REMOTE**: kubectl, helm, coder, terraform, cloudflared, hcloud versions (with outdated warnings)
- **SECRETS**: Infisical CLI, `.infisical.json`, Infisical server status
- **CONTAINERS**: Running dev container status, Coder workspace listing

## Prerequisites

### Local (`devenv up`)

| Tool | Auto-Install |
|------|-------------|
| mise | Yes (bootstrap script) |
| Docker | **No** — prints platform-specific install instructions |
| devcontainer CLI | Yes (`npm install -g @devcontainers/cli`) |

### Remote (`devenv deploy`)

All local prerequisites plus:

| Tool | Auto-Install | Version Source |
|------|-------------|----------------|
| hcloud CLI | Yes (via mise) | `SystemToolVersionsSchema` |
| kubectl | Yes (via mise) | `SystemToolVersionsSchema` |
| helm | Yes (via mise) | `SystemToolVersionsSchema` |
| coder CLI | Yes (via curl) | Latest |
| SSH key | Yes (auto-generated + permissions validated) | — |

## Config Change Flow

### Local

1. Change `resist.config.ts`
2. Run `pnpm tool sync` — regenerates `.devcontainer/` files
3. Run `pnpm tool devenv up --rebuild` — rebuilds container with new config
4. Config change auto-detection warns if rebuild is needed but `--rebuild` not passed

### Remote (CI)

1. Merge to main triggers CI
2. CI runs `pnpm tool sync`
3. CI runs `pnpm tool devenv deploy --image-only` (if Dockerfile changed)
4. CI runs `pnpm tool devenv push` — updates Coder template
5. Existing workspaces update when developer clicks "Update" in Coder dashboard

## Configuration

Controlled via `resist.config.ts`:

```typescript
tooling: {
  devContainer: {
    enabled: true,
    baseImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
    aptPackages: ['postgresql-client'],
    additionalPorts: [5432],
    envVars: { NODE_ENV: 'development' },
    autoOpen: false,
  },
  coder: {
    enabled: true,
    accessUrl: 'https://coder.example.com',
    repoUrl: '',
    resources: { cpu: 4, memoryGb: 8, diskGb: 50 },
    registry: { url: 'ghcr.io', namespace: 'myorg', authMethod: 'docker-login' },
    serverType: 'cx32',
    location: 'fsn1',
    arch: 'amd64',
    ide: 'vscode-web',
    dotfilesRepo: '',
  },
}
```

Set `enabled: false` to skip generating those template files during sync.

## Deployment Config

API tokens are stored in `.devenv.json` (gitignored) at the workspace root. Use `--force` to re-prompt for these values.

Infrastructure state is tracked in `.devenv-state.json` (gitignored) — records which resources were provisioned for idempotent deploys and targeted teardown.

## Architecture

```
devenv/
├── index.ts                    # Command definition (createCommand) + subcommand dispatch
├── flags/
│   ├── index.ts                # Auto-discovery via import.meta.glob
│   ├── force.ts                # --force flag
│   ├── rebuild.ts              # --rebuild flag
│   ├── image-only.ts           # --image-only flag
│   └── prune.ts                # --prune flag (used by down)
├── locales/
│   ├── schema.ts               # Valibot schema for locale strings
│   └── locales/
│       └── en.ts               # English strings
└── utils/
    ├── prerequisites.ts        # Detection, installation, verification, status reporting
    ├── steps.ts                # Individual setup step implementations + state tracking
    └── teardown.ts             # Local container teardown + remote infrastructure destroy
```

## Examples

```sh
# Local container lifecycle
pnpm tool devenv up                    # Set up local dev container
pnpm tool devenv up --rebuild          # Rebuild after config change
pnpm tool devenv down                  # Stop and remove container
pnpm tool devenv down --prune          # Stop + remove images
pnpm tool devenv restart               # Stop then re-start
pnpm tool devenv exec                  # Shell into running container
pnpm tool devenv exec -- npm test      # Run command in container
pnpm tool devenv logs                  # Stream container logs
pnpm tool devenv prebuild              # Pre-cache container image

# Remote workspace lifecycle
pnpm tool devenv deploy                # Full VPS + Coder from scratch
pnpm tool devenv deploy --image-only   # Rebuild and push workspace image only
pnpm tool devenv push                  # Push updated Coder template
pnpm tool devenv ssh                   # SSH into remote workspace
pnpm tool devenv stop                  # Stop remote workspace
pnpm tool devenv start                 # Start stopped workspace
pnpm tool devenv destroy --confirm     # Tear down remote infrastructure

# Utilities
pnpm tool devenv status                # Check what's installed + running
pnpm tool devenv env                   # Generate .env from Infisical
pnpm tool devenv up --dry-run          # Preview without executing
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Completed successfully |
| `1` | Failed or prerequisite missing |
| `2` | Invalid command usage or arguments |
| `3` | Unexpected fatal error |
| `130` | Operation interrupted by user (Ctrl+C) |
