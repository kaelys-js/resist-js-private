#!/usr/bin/env bash
# Stop hook: override for preview plugin stop callbacks.
# Allows stop unconditionally — the preview plugin is disabled but its
# callback still fires. This hook silences it.
echo '{"decision": "allow"}'
