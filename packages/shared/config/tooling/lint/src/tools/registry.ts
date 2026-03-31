/**
 * Tool Registry — central list of all external linting tools.
 *
 * Consolidates tool imports into a single export so consumers don't
 * need to import each tool individually.
 *
 * @module
 */

/* oxlint-disable max-dependencies -- registry file intentionally imports all tools */
import type { ExternalTool, WorkspaceTool } from '@/lint/framework/tool-orchestrator.ts';
import { actionlintTool } from '@/lint/tools/actionlint.ts';
import { asciidocTool } from '@/lint/tools/asciidoc.ts';
import { astroTool } from '@/lint/tools/astro.ts';
import { attwTool } from '@/lint/tools/attw.ts';
import { batchTool } from '@/lint/tools/batch.ts';
import { bazelTool } from '@/lint/tools/bazel.ts';
import { cargoClippyTool } from '@/lint/tools/cargo-clippy.ts';
import { cargoTomlTool } from '@/lint/tools/cargo-toml.ts';
import { checkstyleTool } from '@/lint/tools/checkstyle.ts';
import { clangTidyTool } from '@/lint/tools/clang-tidy.ts';
import { cmakeLintTool } from '@/lint/tools/cmake.ts';
import { codeownersTool } from '@/lint/tools/codeowners.ts';
import { codeownersCheckerTool } from '@/lint/tools/codeowners-checker.ts';
import { commitlintTool } from '@/lint/tools/commitlint.ts';
import { confTool } from '@/lint/tools/conf.ts';
import { crystalTool } from '@/lint/tools/crystal.ts';
import { csvTool } from '@/lint/tools/csv.ts';
import { cueTool } from '@/lint/tools/cue.ts';
import { dependabotTool } from '@/lint/tools/dependabot.ts';
import { dependencyCruiserTool } from '@/lint/tools/dependency-cruiser.ts';
import { dhallTool } from '@/lint/tools/dhall.ts';
import { dmdTool } from '@/lint/tools/dmd.ts';
import { dockerComposeTool } from '@/lint/tools/docker-compose.ts';
import { dotenvLinterTool } from '@/lint/tools/dotenv-linter.ts';
import { dotnetFormatTool } from '@/lint/tools/dotnet-format.ts';
import { editorconfigCheckerTool } from '@/lint/tools/editorconfig.ts';
import { credoTool } from '@/lint/tools/elixir-credo.ts';
import { erlcTool } from '@/lint/tools/erlc.ts';
import { fantomasTool } from '@/lint/tools/fantomas.ts';
import { fishTool } from '@/lint/tools/fish.ts';
import { gitattributesTool } from '@/lint/tools/gitattributes.ts';
import { githubFundingTool } from '@/lint/tools/github-funding.ts';
import { githubIssueTemplateTool } from '@/lint/tools/github-issue-template.ts';
import { githubPrTemplateTool } from '@/lint/tools/github-pr-template.ts';
import { gitleaksTool } from '@/lint/tools/gitleaks.ts';
import { goModTool } from '@/lint/tools/go-mod.ts';
import { golangciLintTool } from '@/lint/tools/golangci-lint.ts';
import { graphqlTool } from '@/lint/tools/graphql.ts';
import { groovyLintTool } from '@/lint/tools/groovy-lint.ts';
import { hadolintTool } from '@/lint/tools/hadolint.ts';
import { handlebarsTool } from '@/lint/tools/handlebars.ts';
import { hclTool } from '@/lint/tools/hcl.ts';
import { helmLintTool } from '@/lint/tools/helm-lint.ts';
import { helmValuesTool } from '@/lint/tools/helm-values.ts';
import { hlintTool } from '@/lint/tools/hlint.ts';
import { htmlhintTool } from '@/lint/tools/htmlhint.ts';
import { ignoreFilesTool } from '@/lint/tools/ignore-files.ts';
import { iniTool } from '@/lint/tools/ini.ts';
import { jscpdTool } from '@/lint/tools/jscpd.ts';
import { jsonlintTool } from '@/lint/tools/jsonlint.ts';
import { jsonnetTool } from '@/lint/tools/jsonnet.ts';
import { juliaTool } from '@/lint/tools/julia.ts';
import { justTool } from '@/lint/tools/justfile.ts';
import { knipTool } from '@/lint/tools/knip.ts';
import { ktlintTool } from '@/lint/tools/ktlint.ts';
import { kubeLinterTool } from '@/lint/tools/kube-linter.ts';
import { kubeconformTool } from '@/lint/tools/kubeconform.ts';
import { chktexTool } from '@/lint/tools/latex.ts';
import { licenseCheckerTool } from '@/lint/tools/license-checker.ts';
import { lockfileLintTool } from '@/lint/tools/lockfile-lint.ts';
import { lsLintTool } from '@/lint/tools/ls-lint.ts';
import { luacheckTool } from '@/lint/tools/luacheck.ts';
import { madgeTool } from '@/lint/tools/madge.ts';
import { checkmakeTool } from '@/lint/tools/makefile.ts';
import { markdownlintTool } from '@/lint/tools/markdownlint.ts';
import { moveTool } from '@/lint/tools/move.ts';
import { mypyTool } from '@/lint/tools/mypy.ts';
import { nimTool } from '@/lint/tools/nim.ts';
import { ninjaTool } from '@/lint/tools/ninja.ts';
import { nixTool } from '@/lint/tools/nix.ts';
import { nomadTool } from '@/lint/tools/nomad.ts';
import { npmrcTool } from '@/lint/tools/npmrc.ts';
import { nvmrcTool } from '@/lint/tools/nvmrc.ts';
import { ocamlTool } from '@/lint/tools/ocaml.ts';
import { oxlintTool } from '@/lint/tools/oxlint.ts';
import { packageJsonValidatorTool } from '@/lint/tools/package-json-validator.ts';
import { packerTool } from '@/lint/tools/packer.ts';
import { perlTool } from '@/lint/tools/perl.ts';
import { phpTool } from '@/lint/tools/php.ts';
import { powershellTool } from '@/lint/tools/powershell.ts';
import { propertiesTool } from '@/lint/tools/properties.ts';
import { protobufTool } from '@/lint/tools/protobuf.ts';
import { publintTool } from '@/lint/tools/publint.ts';
import { pyprojectTomlTool } from '@/lint/tools/pyproject-toml.ts';
import { reasonTool } from '@/lint/tools/reason.ts';
import { rscriptTool } from '@/lint/tools/rscript.ts';
import { rstcheckTool } from '@/lint/tools/rstcheck.ts';
import { rubocopTool } from '@/lint/tools/rubocop.ts';
import { ruffTool } from '@/lint/tools/ruff.ts';
import { scalafmtTool } from '@/lint/tools/scalafmt.ts';
import { sentinelTool } from '@/lint/tools/sentinel.ts';
import { shellcheckTool } from '@/lint/tools/shellcheck.ts';
import { solhintTool } from '@/lint/tools/solidity.ts';
import { sortPackageJsonTool } from '@/lint/tools/sort-package-json.ts';
import { sqlfluffTool } from '@/lint/tools/sqlfluff.ts';
import { stylelintTool } from '@/lint/tools/stylelint.ts';
import { svglintTool } from '@/lint/tools/svglint.ts';
import { swiftlintTool } from '@/lint/tools/swiftlint.ts';
import { syncpackTool } from '@/lint/tools/syncpack.ts';
import { taploTool } from '@/lint/tools/taplo.ts';
import { terraformTool } from '@/lint/tools/terraform.ts';
import { thriftTool } from '@/lint/tools/thrift.ts';
import { trufflehogTool } from '@/lint/tools/trufflehog.ts';
import { typosTool } from '@/lint/tools/typos.ts';
import { vbTool } from '@/lint/tools/vb.ts';
import { vlangTool } from '@/lint/tools/vlang.ts';
import { vyperTool } from '@/lint/tools/vyper.ts';
import { watTool } from '@/lint/tools/wat.ts';
import { xmlTool } from '@/lint/tools/xml.ts';
import { yamllintTool } from '@/lint/tools/yamllint.ts';
import { zigTool } from '@/lint/tools/zig.ts';
import { zshTool } from '@/lint/tools/zsh.ts';
import { svelteCheckTool } from '@/lint/tools/svelte-check.ts';
import { tsgoTool } from '@/lint/tools/tsgo.ts';

/** All registered external linting tools. */
export const ALL_TOOLS: readonly ExternalTool[] = [
  actionlintTool,
  asciidocTool,
  astroTool,
  attwTool,
  batchTool,
  bazelTool,
  cargoClippyTool,
  cargoTomlTool,
  checkmakeTool,
  checkstyleTool,
  chktexTool,
  clangTidyTool,
  cmakeLintTool,
  codeownersCheckerTool,
  codeownersTool,
  commitlintTool,
  confTool,
  credoTool,
  crystalTool,
  csvTool,
  cueTool,
  dependabotTool,
  dependencyCruiserTool,
  dhallTool,
  dmdTool,
  dockerComposeTool,
  dotenvLinterTool,
  dotnetFormatTool,
  editorconfigCheckerTool,
  erlcTool,
  fantomasTool,
  fishTool,
  gitattributesTool,
  githubFundingTool,
  githubIssueTemplateTool,
  githubPrTemplateTool,
  gitleaksTool,
  goModTool,
  golangciLintTool,
  graphqlTool,
  groovyLintTool,
  hadolintTool,
  handlebarsTool,
  hclTool,
  helmLintTool,
  helmValuesTool,
  hlintTool,
  htmlhintTool,
  ignoreFilesTool,
  iniTool,
  jscpdTool,
  jsonlintTool,
  jsonnetTool,
  juliaTool,
  justTool,
  knipTool,
  ktlintTool,
  kubeLinterTool,
  kubeconformTool,
  licenseCheckerTool,
  lockfileLintTool,
  lsLintTool,
  luacheckTool,
  madgeTool,
  markdownlintTool,
  moveTool,
  mypyTool,
  nimTool,
  ninjaTool,
  nixTool,
  nomadTool,
  npmrcTool,
  nvmrcTool,
  ocamlTool,
  oxlintTool,
  packageJsonValidatorTool,
  packerTool,
  perlTool,
  phpTool,
  powershellTool,
  propertiesTool,
  protobufTool,
  publintTool,
  pyprojectTomlTool,
  reasonTool,
  rscriptTool,
  rstcheckTool,
  rubocopTool,
  ruffTool,
  scalafmtTool,
  sentinelTool,
  shellcheckTool,
  solhintTool,
  sortPackageJsonTool,
  sqlfluffTool,
  stylelintTool,
  svglintTool,
  swiftlintTool,
  syncpackTool,
  taploTool,
  terraformTool,
  thriftTool,
  trufflehogTool,
  typosTool,
  vbTool,
  vlangTool,
  vyperTool,
  watTool,
  xmlTool,
  yamllintTool,
  zigTool,
  zshTool,
];

/** All registered workspace-level tools (type-checkers, etc.). */
export const ALL_WORKSPACE_TOOLS: readonly WorkspaceTool[] = [svelteCheckTool, tsgoTool];
