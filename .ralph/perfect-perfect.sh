#!/bin/bash
# perfect-perfect.sh — Audit the perfect scripts themselves and create PRD(s).
#
# The perfect-*.sh scripts audit the codebase. But who audits the auditors?
# This script does. It launches a Claude session to review perfect.sh and
# every perfect-*.sh script for bugs, missed edge cases, prompt quality
# issues, and shell scripting sins.
#
# Usage: bash .ralph/perfect-perfect.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs "perfect" audit infrastructure — the scripts that audit the codebase. Your job is to audit the auditors.

## Your Target

The following files in .ralph/ constitute the "perfect" audit system:

1. **perfect.sh** — the parallel orchestrator that discovers and runs all perfect-*.sh scripts
2. **perfect-prompt.md** — shared guidelines prepended to every audit prompt
3. **run-prompt.sh** — the Claude CLI wrapper that streams and filters output
4. **perfect-backend.sh** — audits MCP server, CLI, plugin-tools
5. **perfect-extension.sh** — audits Chrome extension
6. **perfect-plugins.sh** — audits example plugins
7. **perfect-sdk.sh** — audits plugin SDK
8. **perfect-e2e.sh** — audits E2E tests
9. **perfect-docs.sh** — audits documentation
10. **perfect-cli-user.sh** — audits CLI from user perspective
11. **perfect-cli-plugin-developer.sh** — audits CLI from plugin dev perspective
12. **perfect-cli-platform-contributor.sh** — audits CLI from contributor perspective

## Step 1: Read every file

Read ALL of the above files. Every line. These are shell scripts and markdown prompts — they are short. No excuses for skimming.

## Step 2: Audit the shell scripts (Phase 1 — Collect)

**As you read each file, append every potential finding to `/tmp/perfect-findings.md`** per the Audit Method above. Do not filter yet — just collect.

For perfect.sh, run-prompt.sh, and every perfect-*.sh script, look for:

- **Shell bugs**: unquoted variables, missing error handling, broken pipelines, race conditions in parallel execution, incorrect signal handling, fd leaks
- **Process management issues**: orphaned claude processes on interrupt, zombie processes, incorrect wait logic, missing cleanup
- **Prompt injection risks**: can a filename or path break the prompt boundary? Are heredocs properly quoted?
- **Incorrect stream filtering**: does run-prompt.sh correctly parse all claude output types? Are there JSON parsing edge cases?
- **Missing edge cases**: what if there are zero perfect-*.sh scripts? What if a script is not executable? What if claude is not installed?

## Step 3: Audit the prompts

For perfect-prompt.md and the embedded prompts in each perfect-*.sh, look for:

- **Contradictory instructions**: does one section tell the agent to do X while another implies not-X?
- **Ambiguous scope boundaries**: could two scripts accidentally audit the same files and create conflicting PRDs?
- **Missing guidance that would cause bad PRDs**: are there common mistake patterns that the prompt doesn't warn against?
- **Prompt quality**: are the instructions clear, precise, and actionable? Or are they vague enough that a literal-minded agent would go off the rails?

## Step 4: Filter findings (Phase 2)

Read `/tmp/perfect-findings.md` in full. For each finding, apply the Validation Checklist from the shared guidelines. For each finding, write "KEEP: [reason]" or "DISCARD: [reason]" to force explicit justification. Delete discarded findings.

## Step 5: Create PRD(s) using the ralph skill (Phase 3)

Use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s) from the surviving findings.

Key parameters:
- Target project: "OpenTabs Platform" (root monorepo)
- Do NOT set workingDirectory or qualityChecks
- Stories should target .ralph/ files only
- All stories: e2eCheckpoint: false (these are infra scripts, not product code)
PROMPT_EOF

echo "=== perfect-perfect.sh ==="
echo "Launching Claude to audit the audit scripts..."
echo "Who watches the watchmen? We do."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
