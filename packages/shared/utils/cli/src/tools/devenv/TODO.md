# devenv — Manual Verification Checklist

These verification steps require Docker, a Hetzner account, Cloudflare account, and/or a running Coder instance. They cannot be run in a standard CI environment and must be tested manually.

## Docker Build (Verification Step 5)

- [ ] After running `pnpm tool sync`, verify `.devcontainer/Dockerfile` exists
- [ ] Run `docker build -t devenv-test -f .devcontainer/Dockerfile .`
- [ ] Verify Node.js is available at the configured version: `docker run --rm devenv-test node --version`
- [ ] Verify mise is installed: `docker run --rm devenv-test mise --version`
- [ ] Verify the package manager is available via corepack: `docker run --rm devenv-test pnpm --version`
- [ ] Verify build-essential is installed: `docker run --rm devenv-test gcc --version`

## DevContainer Open (Verification Step 6)

- [ ] Open the repo in VSCode
- [ ] Run `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
- [ ] Verify the container builds and starts without errors
- [ ] Verify VSCode settings inside the container match `.vscode/settings.json` (NOT duplicated from devcontainer.json)
- [ ] Verify recommended extensions are installed from `.vscode/extensions.json`
- [ ] Verify `node --version` matches `resist.config.ts` `versions.node`
- [ ] Verify `pnpm --version` matches `resist.config.ts` `versions.packageManager`
- [ ] Verify `mise --version` works and system tools are available
- [ ] Verify all forwarded ports are accessible from the host browser

## Terraform Validation (Verification Step 7)

- [ ] After running `pnpm tool sync`, verify `.coder/main.tf` exists
- [ ] Run `cd .coder && terraform init && terraform validate`
- [ ] Verify no syntax errors in the generated HCL
- [ ] Verify all Coder provider resources are valid

## DevEnv CLI — status (Verification Step 8)

- [ ] Run `pnpm tool devenv status`
- [ ] Verify it correctly detects installed tools with version numbers
- [ ] Verify it correctly identifies missing tools
- [ ] Verify the output is color-coded and formatted as a table

## DevEnv CLI — up (Verification Step 9)

- [ ] Ensure Docker is running
- [ ] Run `pnpm tool devenv up` on a fresh clone (no `.devcontainer/` directory)
- [ ] Verify devcontainer CLI is auto-installed if missing
- [ ] Verify sync runs automatically to generate `.devcontainer/` files
- [ ] Verify the container builds and starts successfully
- [ ] Verify "Dev environment ready!" message is printed
- [ ] Run `pnpm tool devenv up` again — verify it doesn't rebuild (idempotent)
- [ ] Run `pnpm tool devenv up --rebuild` — verify it forces a rebuild
- [ ] Change `resist.config.ts`, run sync, then `devenv up` — verify config change warning

## DevEnv CLI — deploy (Verification Step 10)

> **Requires**: Hetzner Cloud account, Cloudflare account, GitHub OAuth App

- [ ] Run `pnpm tool devenv deploy`
- [ ] Verify hcloud/kubectl/helm/coder CLI are auto-installed if missing
- [ ] Verify it prompts for Hetzner API token, Cloudflare API token, GitHub OAuth credentials
- [ ] Verify credentials are saved to `.devenv.json`
- [ ] Verify VPS is created via Hetzner API (check `hcloud server list`)
- [ ] Verify k3s is installed on VPS (SSH in and run `kubectl get nodes`)
- [ ] Verify Coder is installed via Helm (`kubectl get pods -l app=coder`)
- [ ] Verify DNS is configured via Cloudflare Tunnel (curl `https://coder.<domain>/healthz`)
- [ ] Verify workspace image is built and pushed
- [ ] Verify Coder template is pushed (`coder templates list`)
- [ ] Verify first workspace is created (`coder list`)
- [ ] Run `pnpm tool devenv deploy` again — verify it skips all completed steps (idempotent)
- [ ] Verify `.devenv.json` is gitignored

## Config Change Flow (Verification Step 11)

### Local

- [ ] Change `resist.config.ts` (e.g., add a port to `additionalPorts`)
- [ ] Run `pnpm tool sync`
- [ ] Verify `.devcontainer/devcontainer.json` `forwardPorts` array is updated
- [ ] Run `pnpm tool devenv up --rebuild`
- [ ] Verify the container rebuilds with the new config

### Remote

- [ ] Change `resist.config.ts` and run sync
- [ ] Run `pnpm tool devenv push`
- [ ] Verify the Coder template is updated
- [ ] In Coder dashboard, verify existing workspace shows "Update available"
- [ ] Click "Update" and verify workspace gets new config

## Dry-Run Mode

- [ ] Run `pnpm tool devenv up --dry-run` — verify no Docker commands are executed
- [ ] Run `pnpm tool devenv deploy --dry-run` — verify no VPS/Coder commands are executed
- [ ] Verify dry-run output describes what would happen
