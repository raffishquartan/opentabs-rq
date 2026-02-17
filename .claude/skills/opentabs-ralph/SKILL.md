---
name: opentabs-ralph
description: 'Plan work and generate ralph task files for autonomous execution. Use when the user wants to plan tasks, create a prd, run ralph, or fix a batch of issues. Triggers on: ralph, create tasks, plan this, run ralph, prd.'
---

# Ralph Task Planner

Plan work and generate `.ralph/prd.json` task files for autonomous execution by the Ralph agent loop.

Ralph is a bash script (`.ralph/ralph.sh`) that runs an AI coding agent in a loop. Each iteration picks the next incomplete user story from `.ralph/prd.json`, implements it, commits, and marks it done. This skill creates the task file that drives that loop.

---

## The Job

1. Receive a feature description or task from the user
2. Ask 3-5 essential clarifying questions (with lettered options) if the request is ambiguous
3. Generate `.ralph/prd.json` directly (no intermediate files)
4. Determine the iteration count and offer to launch `ralph.sh`

**Important:** Do NOT start implementing. Just create the task file and optionally launch ralph.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Skip this step entirely if the request is already specific enough (e.g., a concrete bug fix list). Focus on:

- **Scope:** What exactly should be done?
- **Boundaries:** What should it NOT do?
- **Story size:** Small focused stories vs medium batches?
- **Success criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal?
   A. Option one
   B. Option two
   C. Option three

2. What scope of changes per story?
   A. Small and focused (1-3 files per story, higher success rate)
   B. Medium batches (group related fixes, fewer iterations)
```

This lets users respond with "1A, 2B" for quick iteration.

---

## Step 2: Generate prd.json

Write directly to `.ralph/prd.json`. Do NOT create intermediate markdown PRD files.

### Archive Check

Before writing, check if `.ralph/prd.json` already exists:

1. Read current `.ralph/prd.json`
2. If it exists:
   - Create archive folder: `.ralph/archive/YYYY-MM-DD-<feature-slug>/`
   - Copy current `prd.json` and `progress.txt` to archive
   - Reset `progress.txt`

### Output Format

```json
{
  "project": "[Project Name]",
  "description": "[What this batch of work accomplishes]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Another criterion",
        "bun run build passes",
        "bun run type-check passes",
        "bun run lint passes",
        "bun run knip passes",
        "bun run test passes",
        "bun run test:e2e passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Context to help the agent implement this story"
    }
  ]
}
```

**Critical:** The `passes` field MUST be the boolean `false`, not `null` or omitted. Ralph checks `passes == false` to find incomplete stories.

---

## Story Rules

### Size: One Context Window

Each story must be completable in ONE iteration (one fresh AI session with no memory of previous work).

**Right-sized stories:**

- Fix a bug in a single module
- Add a new tool or endpoint
- Refactor one file or function
- Update types in one package and fix downstream compile errors
- Extract duplicated code into a shared helper

**Too big (split these):**

- "Refactor the entire module" -- split by file or concern
- "Add a new service" -- split into: scaffold, API client, individual endpoints, tests
- "Fix all lint errors" -- split by package or error category

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

### Ordering: Dependencies First

Stories execute in priority order (1 = first). Earlier stories must not depend on later ones.

**Correct order:**

1. Shared types / data model changes
2. Backend / server changes that consume shared types
3. Frontend / UI changes
4. Tests and documentation

### Acceptance Criteria: Must Be Verifiable

Each criterion must be something the agent can CHECK, not something vague.

**Good:** "saveConfig call includes secret field", "z.number() params have .min(1)", "Dropdown shows 3 options"
**Bad:** "Works correctly", "Handles edge cases", "Good UX"

**Always include the full verification suite** as the final acceptance criteria for every story:

- `bun run build` passes
- `bun run type-check` passes
- `bun run lint` passes
- `bun run knip` passes
- `bun run test` passes
- `bun run test:e2e` passes

### Notes Field

Use the `notes` field to give the agent implementation hints:

- Which file and approximate line number to edit
- What the current code looks like
- What pattern to follow
- What gotchas to watch for

Good notes dramatically increase success rate per iteration.

---

## Step 3: Determine Iterations and Launch

After writing `.ralph/prd.json`:

1. **Count stories** in the prd.json
2. **Calculate iterations**: `stories + ceil(stories * 0.33)` (33% retry buffer)
3. **Tell the user** the story count and iteration count
4. **Launch if requested**: `nohup .ralph/ralph.sh --tool claude <iterations> > /tmp/ralph-<feature>.log 2>&1 &`

### Monitoring Commands

After launching, tell the user:

- **Watch progress:** `tail -f /tmp/ralph-<feature>.log`
- **Check status:** `cat .ralph/progress.txt`
- **Kill if needed:** `pkill -f ralph.sh`

---

## Git Rules

`.ralph/prd.json` and `.ralph/progress.txt` are gitignored and must NEVER be committed. They are ephemeral working files that change on every ralph run. If they are accidentally tracked, remove them from the index with `git rm --cached` without deleting from disk.

Ralph commits code changes only — never ralph's own state files.

---

## Checklist Before Saving

- [ ] Previous run archived (if prd.json already exists)
- [ ] Each story completable in one iteration
- [ ] Stories ordered by dependency (no story depends on a later story)
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] Notes field has implementation hints for non-trivial stories
- [ ] Full verification suite in acceptance criteria (build, type-check, lint, knip, test)
- [ ] Wrote directly to `.ralph/prd.json` (no intermediate files)
