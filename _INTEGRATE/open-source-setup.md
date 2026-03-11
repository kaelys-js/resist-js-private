# Open Source Core + Private Products Setup

This document explains how to use the open source `resist-core` repo as the foundation for your private products.

## Architecture

**Open source repo (`resist-core`):**
```
resist-core/
├── packages/
│   ├── shared/
│   ├── bac/
│   ├── admin/
│   ├── config/
│   └── [template]/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── ...
```

**Your private repo (after setup):**
```
my-project/
├── packages/
│   ├── shared/          # from core
│   ├── bac/             # from core
│   ├── admin/           # from core
│   ├── config/          # from core
│   ├── [template]/      # from core
│   └── products/        # your private products
│       ├── product-a/
│       └── product-b/
├── pnpm-workspace.yaml  # from core
├── turbo.json           # from core
└── package.json         # from core (includes upgrade script)
```

## How It Works

Your private repo is a clone of `resist-core` with an upstream remote. The `packages/products/` directory only exists in your private repo - it never conflicts with core updates because core doesn't have it.

When core releases a new version, you merge the tag into your repo. Your products remain untouched.

---

## First-Time Setup

Run this once to create your private project from the open source core:

```bash
# TODO: can replace with a single line?

# Clone the core at a specific tag
git clone --branch v0.1.0 https://github.com/anthropics/resist-core.git my-project
cd my-project

# Rename origin to 'core' (this is the upstream open source repo)
git remote rename origin core

# Add your private repo as the new origin
git remote add origin git@github.com:your-org/my-project.git

# Push to your private repo
git push -u origin main

pnpm onboard

# Copy template to start your first product
cp -r packages/\[template\] packages/products/my-first-product # TODO: replace with pnpm project:create

# Commit and push
git add .
git commit -m "Initialize private products"
git push
```

---

## Upgrading Core

When a new version of `resist-core` is released:

```bash
pnpm core:upgrade <tag>
```

For example:
```bash
pnpm core:upgrade v0.2.0
```

This fetches the tag from the upstream `core` remote and merges it into your repo.

### What the script does

The `core:upgrade` script in `package.json`:

```json
{
  "scripts": {
    "core:upgrade": "git fetch core --tags && git merge --no-edit"
  }
}
```

### Manual upgrade (if needed)

```bash
# Fetch all tags from core
git fetch core --tags

# Merge a specific tag
git merge v0.2.0 --no-edit

# Resolve any conflicts (rare - only if you modified core files)
# Then push
git push
```

---

## Creating a New Product

```bash
# Copy the template
cp -r packages/\[template\] packages/products/my-new-product

# Update package.json name
cd packages/products/my-new-product
# Edit package.json: change name to "@resist/my-new-product"

# Install dependencies
cd ../../..
pnpm install
```

---

## Important Notes

### Don't modify core packages

Files in these directories come from the open source repo:
- `packages/shared/`
- `packages/bac/`
- `packages/tools/admin/`
- `packages/config/`
- `packages/[template]/`

If you modify them, you'll have merge conflicts on upgrade. Keep all your custom code in `packages/products/`.

If you need changes to core, contribute them upstream.

### Config values come from Infisical

The `packages/config/` directory contains schemas and structure, but actual secret values are pulled from Infisical at runtime. The open source repo has the shape, you provide the values.

### Merge conflicts

Conflicts are rare since `packages/products/` doesn't exist in core. If you do get conflicts:

1. They're likely in root config files (`turbo.json`, `package.json`, etc.)
2. Resolve by keeping your additions and accepting core's updates
3. Or reset and re-apply your changes on top of the new core

### Checking your remotes

```bash
git remote -v
# Should show:
# core    https://github.com/anthropics/resist-core.git (fetch)
# core    https://github.com/anthropics/resist-core.git (push)
# origin  git@github.com:your-org/my-project.git (fetch)
# origin  git@github.com:your-org/my-project.git (push)
```

### Viewing available core versions

```bash
git fetch core --tags
git tag -l
```

---

## Summary

| Action | Command |
|--------|---------|
| First-time setup | Clone, rename remote, add private origin |
| Create product | `cp -r packages/[template] packages/products/name` |
| Upgrade core | `pnpm core:upgrade v0.2.0` |
| Check remotes | `git remote -v` |
| List versions | `git tag -l` |
