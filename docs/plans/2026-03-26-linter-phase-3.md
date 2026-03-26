# @/lint Phase 3 — Full Tool/Format Parity + Schema Fix + Locale Completeness

**Date**: 2026-03-26
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Reference**: `_INTEGRATE/linter/linter-test/scripts/lint.mjs`

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 1161 pass / 0 fail |
| Test files | 22 |
| Tools implemented | 15 |
| Type-check | Passes |
| Format | Clean |
| Oxlint in @/lint | 0 errors |
| Unlocalised strings | ~33 |
| Schema/biome mismatch | Yes (perpetual format diff) |

---

## TASK 1 — Fix Schema/Biome Formatting Mismatch

**Status**: [x] — Verified: Added `collapseShortJsonArrays()` function to cli-helpers.ts. Post-processes JSON.stringify output to collapse short arrays onto single lines matching biome's behavior. 8 tests added. Schema now writes biome-compatible output — `biome format .resist-lint.schema.json` reports "No fixes applied". 1169 tests pass.

**Problem**: `writeJsonSchema()` uses `JSON.stringify(schema, null, 2)` which expands short arrays to multiple lines. Biome collapses them to single lines when they fit within `lineWidth: 100`. This causes perpetual format diffs.

**Plan**:
- In `cli-helpers.ts` `writeJsonSchema()`, post-process the JSON output to collapse short arrays onto single lines (matching biome's behavior)
- Add a `collapseShortArrays(json: string, maxLineWidth: number): string` helper
- Add tests for the helper
- Verify: write schema, run `pnpm -w run qa:format:check`, confirm no diff

**Files**: `cli-helpers.ts`, `cli-helpers.test.ts`

**Verification**: Schema writes without triggering biome format diff

---

## TASK 2 — Localise Remaining Hardcoded English Strings

**Status**: [ ]

**Gap**: 33 hardcoded English strings across 8 source files not using the locale system.

**Plan**:
- Add new string groups to `locale/schema.ts`: `errors`, `warnings`, `listRulesFormat`, `schemaDescriptions`
- Add corresponding strings to `locale/locales/en.ts`
- Replace hardcoded strings in: `cli.ts`, `cli-helpers.ts`, `rule-loader.ts`, `worker-pool.ts`, `config/schema.ts`, `tools/knip.ts`, `tools/typos.ts`, `tools/jsonlint.ts`
- Add locale tests for new string groups

**Files**: `locale/schema.ts`, `locale/locales/en.ts`, `locale/schema.test.ts`, plus 8 source files

**Verification**: All tests pass, no hardcoded English in source files (grep verification)

---

## TASK 3 — Web/Frontend Tools (6 tools)

**Status**: [ ]

**Tools**: astro, svglint, ember-template-lint, graphql-schema-linter, rstcheck, asciidoctor

**Plan**:
- Create `tools/astro.ts` — `astro check`, patterns: `**/*.astro`, text output with regex parser
- Create `tools/svglint.ts` — `svglint --ci`, patterns: `**/*.svg`, text output
- Create `tools/handlebars.ts` — `ember-template-lint --format=json`, patterns: `**/*.hbs`, `**/*.handlebars`, json output
- Create `tools/graphql.ts` — `graphql-schema-linter`, patterns: `**/*.graphql`, `**/*.gql`, text output
- Create `tools/rstcheck.ts` — `rstcheck`, patterns: `**/*.rst`, text output
- Create `tools/asciidoc.ts` — `asciidoctor -o /dev/null -v`, patterns: `**/*.adoc`, text output
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 6 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 4 — Shell/Script Tools (4 tools)

**Status**: [ ]

**Tools**: zsh, fish, powershell, batch

**Plan**:
- Create `tools/zsh.ts` — `zsh -n` (syntax check), patterns: `**/*.zsh`, text output
- Create `tools/fish.ts` — `fish --no-execute`, patterns: `**/*.fish`, text output
- Create `tools/powershell.ts` — `pwsh -NoProfile -Command "Invoke-ScriptAnalyzer"`, patterns: `**/*.ps1`, `**/*.psm1`, `**/*.psd1`, json output
- Create `tools/batch.ts` — custom GOTO validation, patterns: `**/*.bat`, `**/*.cmd`, text output
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 4 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 5 — Systems Languages (8 tools)

**Status**: [ ]

**Tools**: cargo-clippy, clang-tidy, swiftlint, golangci-lint, go-mod, zig, nim, vlang

**Plan**:
- Create `tools/cargo-clippy.ts` — `cargo clippy --message-format=short`, patterns: `**/*.rs`, text
- Create `tools/clang-tidy.ts` — `clang-tidy --quiet`, patterns: `**/*.c`, `**/*.cpp`, `**/*.h`, `**/*.cc`, `**/*.cxx`, `**/*.hpp`, `**/*.hxx`, `**/*.m`, `**/*.mm`, text
- Create `tools/swiftlint.ts` — `swiftlint lint --reporter json`, patterns: `**/*.swift`, json
- Create `tools/golangci-lint.ts` — `golangci-lint run --out-format=line-number`, patterns: `**/*.go`, text
- Create `tools/go-mod.ts` — `go mod verify`, patterns: `**/go.mod`, text
- Create `tools/zig.ts` — `zig ast-check`, patterns: `**/*.zig`, text
- Create `tools/nim.ts` — `nim check`, patterns: `**/*.nim`, text
- Create `tools/vlang.ts` — `v -check`, patterns: `**/*.v`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 8 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 6 — JVM/Managed Languages (7 tools)

**Status**: [ ]

**Tools**: checkstyle, ktlint, scalafmt, groovy-lint, dotnet-format, fantomas, vb

**Plan**:
- Create `tools/checkstyle.ts` — `checkstyle -c /google_checks.xml`, patterns: `**/*.java`, text
- Create `tools/ktlint.ts` — `ktlint --reporter=plain`, patterns: `**/*.kt`, `**/*.kts`, text
- Create `tools/scalafmt.ts` — `scalafmt --check`, patterns: `**/*.scala`, text
- Create `tools/groovy-lint.ts` — `npm-groovy-lint --output json`, patterns: `**/*.groovy`, `**/*.gradle`, json
- Create `tools/dotnet-format.ts` — `dotnet format --verify-no-changes`, patterns: `**/*.cs`, text
- Create `tools/fantomas.ts` — `fantomas --check`, patterns: `**/*.fs`, text
- Create `tools/vb.ts` — no-op placeholder, patterns: `**/*.vb`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 7 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 7 — Dynamic Languages (8 tools)

**Status**: [ ]

**Tools**: rubocop, php-syntax, phpcs, luacheck, perl, elixir-credo, erlc, hlint

**Plan**:
- Create `tools/rubocop.ts` — `rubocop --format json`, patterns: `**/*.rb`, `**/*.rake`, `**/*.gemspec`, json
- Create `tools/php.ts` — `php -l` syntax check + `phpcs --report=json`, patterns: `**/*.php`, `**/*.phtml`, json
- Create `tools/luacheck.ts` — `luacheck --formatter plain`, patterns: `**/*.lua`, text
- Create `tools/perl.ts` — `perl -c` syntax check, patterns: `**/*.pl`, `**/*.pm`, text
- Create `tools/elixir-credo.ts` — `mix credo --format=json`, patterns: `**/*.ex`, `**/*.exs`, json
- Create `tools/erlc.ts` — `erlc -W`, patterns: `**/*.erl`, `**/*.hrl`, text
- Create `tools/hlint.ts` — `hlint --json`, patterns: `**/*.hs`, `**/*.lhs`, json
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 7 new tool files (php combines syntax+phpcs), `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 8 — More Languages (7 tools)

**Status**: [ ]

**Tools**: ocaml, refmt, crystal, dmd, julia, rscript, mypy

**Plan**:
- Create `tools/ocaml.ts` — `ocamlc -c`, patterns: `**/*.ml`, `**/*.mli`, text
- Create `tools/reason.ts` — `refmt --parse re --print re`, patterns: `**/*.re`, `**/*.rei`, text
- Create `tools/crystal.ts` — `crystal tool format --check`, patterns: `**/*.cr`, text
- Create `tools/dmd.ts` — `dmd -c -o-`, patterns: `**/*.d`, text
- Create `tools/julia.ts` — `julia -e "using JuliaFormatter"`, patterns: `**/*.jl`, text
- Create `tools/rscript.ts` — `Rscript -e "lintr::lint"`, patterns: `**/*.r`, `**/*.R`, text
- Create `tools/mypy.ts` — `mypy --no-error-summary`, patterns: `**/*.py`, `**/*.pyi`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 7 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 9 — Infrastructure/IaC Tools (10 tools)

**Status**: [ ]

**Tools**: docker-compose, kubeconform, kube-linter, helm-lint, terraform/tflint, hcl, packer, nomad, sentinel, protobuf

**Plan**:
- Create `tools/docker-compose.ts` — `docker compose config --quiet`, patterns: `**/docker-compose*.yml`, `**/docker-compose*.yaml`, text
- Create `tools/kubeconform.ts` — `kubeconform -output json`, patterns: K8s YAML, json
- Create `tools/kube-linter.ts` — `kube-linter lint --format=json`, patterns: K8s YAML, json
- Create `tools/helm-lint.ts` — `helm lint`, patterns: `**/Chart.yaml`, `**/Chart.yml`, text
- Create `tools/terraform.ts` — `terraform fmt -check` + `tflint --format=compact`, patterns: `**/*.tf`, `**/*.tfvars`, text
- Create `tools/hcl.ts` — `hclfmt -check`, patterns: `**/*.hcl`, text
- Create `tools/packer.ts` — `packer validate`, patterns: `**/*.pkr.hcl`, text
- Create `tools/nomad.ts` — `nomad job validate`, patterns: `**/*.nomad`, text
- Create `tools/sentinel.ts` — `sentinel fmt -check`, patterns: `**/*.sentinel`, text
- Create `tools/protobuf.ts` — `buf lint`, patterns: `**/*.proto`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 10 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 10 — Config Format Tools (9 tools)

**Status**: [ ]

**Tools**: thrift, nix, dhall, cue, jsonnet, bazel, xml, csv, ninja

**Plan**:
- Create `tools/thrift.ts` — `thrift --gen js` (syntax check), patterns: `**/*.thrift`, text
- Create `tools/nix.ts` — `nix-instantiate --parse`, patterns: `**/*.nix`, text
- Create `tools/dhall.ts` — `dhall lint --check`, patterns: `**/*.dhall`, text
- Create `tools/cue.ts` — `cue vet`, patterns: `**/*.cue`, text
- Create `tools/jsonnet.ts` — `jsonnetfmt --test`, patterns: `**/*.jsonnet`, `**/*.libsonnet`, text
- Create `tools/bazel.ts` — `buildifier -lint=warn -mode=check`, patterns: `**/*.bzl`, `**/*.bazel`, `**/*.star`, text
- Create `tools/xml.ts` — `xmllint --noout`, patterns: `**/*.xml`, text
- Create `tools/csv.ts` — custom column consistency check, patterns: `**/*.csv`, text
- Create `tools/ninja.ts` — `ninja -t check`, patterns: `**/*.ninja`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 9 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 11 — Build/Config File Tools (8 tools)

**Status**: [ ]

**Tools**: makefile, cmake, justfile, editorconfig, ini, conf, properties, latex/bibtex

**Plan**:
- Create `tools/makefile.ts` — `checkmake`, patterns: `**/Makefile`, `**/GNUmakefile`, `**/*.mk`, text
- Create `tools/cmake.ts` — `cmake-lint`, patterns: `**/CMakeLists.txt`, `**/*.cmake`, text
- Create `tools/justfile.ts` — `just --check --justfile`, patterns: `**/justfile`, text
- Create `tools/editorconfig.ts` — `editorconfig-checker` or `ec`, patterns: `**/.editorconfig`, text
- Create `tools/ini.ts` — custom syntax check, patterns: `**/*.ini`, text
- Create `tools/conf.ts` — custom syntax check (delegates to ini), patterns: `**/*.conf`, `**/*.cfg`, text
- Create `tools/properties.ts` — custom key=value syntax check, patterns: `**/*.properties`, text
- Create `tools/latex.ts` — `chktex` for .tex + `biber --validate-datamodel` for .bib, patterns: `**/*.tex`, `**/*.bib`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 8 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 12 — Blockchain/WASM/Special (4 tools)

**Status**: [ ]

**Tools**: solidity, move, vyper, wat

**Plan**:
- Create `tools/solidity.ts` — `solhint -f stylish`, patterns: `**/*.sol`, text
- Create `tools/move.ts` — `move build`, patterns: `**/*.move`, text
- Create `tools/vyper.ts` — `vyper -f bytecode` (syntax check), patterns: `**/*.vy`, text
- Create `tools/wat.ts` — `wat2wasm --debug-names -o /dev/null`, patterns: `**/*.wat`, `**/*.wast`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 4 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 13 — Dotfile/Config Validators (4 tools)

**Status**: [ ]

**Tools**: npmrc, nvmrc, ignore-files, gitattributes

**Plan**:
- Create `tools/npmrc.ts` — custom validation (valid settings whitelist, syntax check), patterns: `**/.npmrc`, text
- Create `tools/nvmrc.ts` — custom validation (version pattern), patterns: `**/.nvmrc`, text
- Create `tools/ignore-files.ts` — custom validation (`***` check, trailing whitespace, duplicates), patterns: `**/.gitignore`, `**/.dockerignore`, `**/.prettierignore`, `**/.eslintignore`, `**/.helmignore`, text
- Create `tools/gitattributes.ts` — custom validation (valid attributes, conflicting text+binary), patterns: `**/.gitattributes`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 4 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 14 — GitHub/CI Validators (5 tools)

**Status**: [ ]

**Tools**: github-issue-template, github-pr-template, github-funding, codeowners, dependabot

**Plan**:
- Create `tools/github-issue-template.ts` — YAML + field validation (name, description, labels), patterns: `**/.github/ISSUE_TEMPLATE/*.yml`, `**/.github/ISSUE_TEMPLATE/*.yaml`, text
- Create `tools/github-pr-template.ts` — content validation (empty check, checklist), patterns: `**/pull_request_template.md`, text
- Create `tools/github-funding.ts` — YAML + platform validation, patterns: `**/.github/FUNDING.yml`, text
- Create `tools/codeowners.ts` — syntax validation (owner format, broad patterns), patterns: `**/CODEOWNERS`, text
- Create `tools/dependabot.ts` — YAML + schema validation (version, updates, ecosystems), patterns: `**/.github/dependabot.yml`, `**/.github/dependabot.yaml`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 5 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 15 — Workspace-Level Analysis Tools (9 tools)

**Status**: [ ]

**Tools**: jscpd, madge, publint, attw, sort-package-json, dependency-cruiser, license-checker, syncpack, ls-lint

**Plan**:
- Create `tools/jscpd.ts` — `jscpd --reporters json --silent`, workspace-level, json
- Create `tools/madge.ts` — `madge --circular --json`, workspace-level, json
- Create `tools/publint.ts` — `publint --format json`, workspace-level, json
- Create `tools/attw.ts` — `attw --pack --format json`, workspace-level, json
- Create `tools/sort-package-json.ts` — `sort-package-json --check`, workspace-level, text
- Create `tools/dependency-cruiser.ts` — `depcruise --output-type json`, workspace-level, json
- Create `tools/license-checker.ts` — `license-checker --json`, workspace-level, json
- Create `tools/syncpack.ts` — `syncpack list-mismatches`, workspace-level, text
- Create `tools/ls-lint.ts` — `ls-lint`, workspace-level, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 9 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 16 — Security/Quality Tools (4 tools)

**Status**: [ ]

**Tools**: gitleaks, trufflehog, lockfile-lint, codeowners-checker

**Plan**:
- Create `tools/gitleaks.ts` — `gitleaks detect --report-format json --no-git`, patterns: any file, json
- Create `tools/trufflehog.ts` — `trufflehog filesystem --json --no-update`, patterns: any file, json (JSONL)
- Create `tools/lockfile-lint.ts` — `lockfile-lint`, patterns: lockfiles, text
- Create `tools/codeowners-checker.ts` — `codeowners-checker check`, workspace-level, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 4 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## TASK 17 — Special File Validators (4 tools)

**Status**: [ ]

**Tools**: package-json validator, cargo-toml validator, pyproject-toml validator, helm validators

**Plan**:
- Create `tools/package-json-validator.ts` — custom JSON parse + checks (name, version, ESM), patterns: `**/package.json`, text
- Create `tools/cargo-toml.ts` — taplo + [package]/[workspace] section check, patterns: `**/Cargo.toml`, text
- Create `tools/pyproject-toml.ts` — taplo + [project]/[tool.poetry] section check, patterns: `**/pyproject.toml`, text
- Create `tools/helm-values.ts` — YAML lint + helm template validation, patterns: `**/values.yaml`, `**/values.yml`, text
- Add transform tests for each
- Register all in `tools/registry.ts`

**Files**: 4 new tool files, `tools/tools.test.ts`, `tools/registry.ts`

**Verification**: Tests pass, all tools registered, QA clean

---

## Execution Order

| Order | Task | Description | Tools |
|-------|------|-------------|-------|
| 1 | 1 | Fix schema/biome formatting mismatch | 0 |
| 2 | 2 | Localise remaining hardcoded strings | 0 |
| 3 | 3 | Web/frontend tools | 6 |
| 4 | 4 | Shell/script tools | 4 |
| 5 | 5 | Systems languages | 8 |
| 6 | 6 | JVM/managed languages | 7 |
| 7 | 7 | Dynamic languages | 8 |
| 8 | 8 | More languages | 7 |
| 9 | 9 | Infrastructure/IaC tools | 10 |
| 10 | 10 | Config format tools | 9 |
| 11 | 11 | Build/config file tools | 8 |
| 12 | 12 | Blockchain/WASM/special | 4 |
| 13 | 13 | Dotfile/config validators | 4 |
| 14 | 14 | GitHub/CI validators | 5 |
| 15 | 15 | Workspace-level analysis | 9 |
| 16 | 16 | Security/quality tools | 4 |
| 17 | 17 | Special file validators | 4 |

**Total: 17 tasks, ~97 new tools/validators, bringing total from 15 to ~112**
