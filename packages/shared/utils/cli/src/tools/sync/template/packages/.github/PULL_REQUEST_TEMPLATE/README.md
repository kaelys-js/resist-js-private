# 📝 Pull Request Templates

This directory contains standardized pull request templates to guide contributors in creating effective and consistent PRs.

---

## 📄 Available Templates

| Template File             | Purpose                                                        |
|---------------------------|----------------------------------------------------------------|
| `access_controls.md`      | Permissions and system-level access changes                    |
| `access_review.md`        | Role/permission changes or access reviews                      |
| `analytics_event.md`      | Adding or modifying telemetry or tracking events               |
| `breaking_change.md`      | Changes that require a major version bump                      |
| `bug_fix.md`              | Fixes for known bugs or regressions                            |
| `chore.md`                | Routine maintenance and small internal updates                 |
| `ci_cd_update.md`         | Changes to GitHub Actions, CI/CD pipelines                     |
| `cleanup.md`              | Removing dead code or simplifying internals                    |
| `config_change.md`        | Application or environment config modifications                |
| `data_migration.md`       | Database or data structure migrations                          |
| `default.md`              | General-purpose template for uncategorized changes             |
| `design_review.md`        | Early-stage design proposals for review                        |
| `documentation.md`        | Changes to documentation, READMEs, or guides                   |
| `experiment.md`           | Prototypes, spikes, or exploratory work                        |
| `feature_request.md`      | New feature proposals                                          |
| `handoff.md`              | Work handoff between contributors                              |
| `i18n.md`                 | Internationalization and localization updates                  |
| `infra_change.md`         | Infrastructure, IaC, or deployment system updates              |
| `internal_tooling.md`     | Developer tools, linters, scripts, etc.                        |
| `onboarding.md`           | Improvements to dev onboarding docs or tooling                 |
| `other.md`                | General-purpose fallback for uncategorized changes             |
| `performance.md`          | Performance optimizations                                      |
| `refactor.md`             | Internal code reorganization without functional changes        |
| `release_preparation.md`  | Preparing for an official release                              |
| `rollback.md`             | Reverting a previous pull request                              |
| `security.md`             | Security-related fixes or enhancements                         |
| `styleguide_update.md`    | Updates to code/design standards and formatting rules          |
| `test.md`                 | Adding, updating, or removing test cases                       |
| `third_party_update.md`   | Updating external dependencies or SDKs                         |
| `ab_test.md`               | Implementation of A/B or multivariate experiments           |
| `api_versioning.md`        | API versioning, deprecations, or contract-breaking changes  |
| `compliance.md`            | Legal, regulatory, or policy compliance-related changes      |
| `communications.md`        | Updates to user-facing or internal communication channels    |
| `dev_experience.md`        | Improvements to developer workflow, setup, or tooling        |
| `billing.md`               | Changes to billing, subscriptions, or pricing logic          |
| `integration.md`           | External service integrations (e.g., Slack, Salesforce)       |
| `monitoring_alerting.md`   | Updates to monitoring, logs, alerts, or dashboards           |
| `usage_reporting.md`       | Usage data, metering, reporting, or audit logs               |
| `auth_identity.md`         | Identity management, SSO, OAuth, or authentication changes   |
| `plan_migration.md`        | Feature or pricing plan migrations for existing customers     |
| `feature_flag.md`           | Introduce or retire a feature flag for gated rollouts                  |
| `incident_postmortem.md`    | Follow-up fixes or changes after an incident or outage                 |
| `support_case_response.md`  | Fixes driven by customer support tickets or complaints                 |
| `sandbox_environment.md`    | Modifies a sandbox, preview, or ephemeral test environment             |
| `incident_response.md`      | Hotfixes or patches applied during an active incident         |
| `data_retention.md`         | Data retention, purging, or archival policy changes           |
| `ai_model_update.md`        | ML model updates, retraining, or inference pipeline changes   |
| `mobile_release.md`         | Mobile app version bumps, release metadata, or rollout config |
| `beta_program.md`           | Releasing or managing a beta test cohort                      |
| `content_update.md`         | In-app content, CMS, or UI copy updates                       |
| `api_docs.md`               | Updates to public or partner-facing API documentation         |
| `performance_regression.md` | Fixing a performance issue or degradation                     |
| `deprecation_notice.md`     | Removing, sunsetting, or deprecating a feature or endpoint    |
| `workspace_change.md`       | Changes to shared modules or workspaces in a monorepo              |
| `cross_team_change.md`      | Changes affecting code owned by multiple teams                     |
| `technical_strategy.md`     | Long-term tech direction, patterns, or architectural planning       |
| `project_kickoff.md`        | Initial PR to scope and align on a new project or epic             |
| `end_of_life.md`            | Planning to retire or remove a product or major feature             |
| `sales_demo_env.md`         | PRs that update or spin up sales/demo environments               |
| `marketing_landing_page.md` | Updates to the public marketing website or landing pages          |
| `pricing_page.md`           | Updates to pricing or plan comparison pages                        |
| `training_tool.md`          | Internal dev onboarding or training improvements                  |
| `feature_flag_cleanup.md`   | Removes stale or expired feature flags                           |
| `changelog_entry.md`        | Adds or edits changelog entries, release notes                   |
| `secrets_rotation.md`       | Rotates API keys, credentials, or encrypted secrets              |
| `legal_copy.md`             | Updates to legal policies (ToS, Privacy Policy, etc.)            |
| `automated_refactor.md`     | Codebase-wide automated changes or codemods                     |
| `tutorial_update.md`        | Updates to internal or customer-facing tutorials                 |
| `build_pipeline_change.md`  | Changes to build tools, bundlers, or compilation workflows       |
| `template_suggestions.md`   | Proposes a new pull request template for future inclusion        |

---

## 🧭 Choosing the Right Template

When opening a pull request:
1. GitHub will present a dropdown list of templates.
2. Choose the template that best matches the type of change you're submitting.
3. If unsure or your PR doesn’t fit any listed category, use `other.md` or `default.md`.

> 💡 Tip: Use consistent branch naming (e.g. `feat/`, `fix/`, `infra/`) to help auto-assign templates and labels via automation.

---

## 🔧 Maintaining This Folder

To **add** a new template:
1. Create a new `.md` file in this folder.
2. Add a row in the table above with a description.
3. Update `.github/config.yml` if you use automated routing or labeling.

To **remove** a template:
- Delete the `.md` file.
- Remove its row from this README.
- Adjust `config.yml` automation as needed.

---

## ✅ Best Practices

- Use clear, conventional PR titles (e.g. `feat:`, `fix:`, `chore:`).
- Complete the full checklist in your selected template.
- Link any related issues (`Closes #123`) to ensure traceability.
- Keep your changes focused — one purpose per PR.
- Ask for specific reviewers if extra context is needed.

---

## 🆕 Missing Template?

If none of the templates fit your pull request:
- Use `other.md` or `default.md`
- Or contact the maintainers to propose a new one
