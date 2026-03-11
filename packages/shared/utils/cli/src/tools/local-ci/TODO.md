# Local CI Tool — Manual Verification Checklist

- [ ] Docker + act install via mise
- [ ] `local-ci status` output
- [ ] `local-ci list` workflow listing
- [ ] `local-ci lint` actionlint validation
- [ ] `local-ci run` basic workflow execution
- [ ] `local-ci run -j <job>` selective job execution
- [ ] `local-ci run --dry-run` command preview
- [ ] Apple Silicon `--container-architecture` injection
- [ ] `.actrc` runner size variations (micro/medium/large)
- [ ] Conditional skipping when `tooling.ci.enabled = false`
