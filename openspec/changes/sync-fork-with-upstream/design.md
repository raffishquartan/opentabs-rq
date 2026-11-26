## Context

The documented fork strategy (`CLAUDE.fork.md`, written 2026-05-09 for a different machine layout) defines: `main` == upstream release tag, `f/<feature>` branches rebased on `main`, `exec-branch` rebuilt from scratch, live server runs from `exec-branch`'s checkout. Current state: local and remote `main` are at `2347e3ec` (upstream v0.0.106 plus 3 fork-only commits: dialog fix, its PR merge, `openspec/`), and the live server runs the primary checkout on `main`. `origin/exec-branch` (2026-05-09) is not an ancestor of `main`. `f/fork-strategy-doc`, `f/restore-screenshot-tab-filepath`, `f/screenshot-tab-integrated` and `exec-branch` sit on `b1e406d4`, a rewritten-history twin of upstream's `42e0df9b` (identical tree, not an ancestor of the tag); a plain `git rebase main` on them would replay hundreds of commits. `f/gitignore-superpowers`, `f/fork-readme` and `f/screenshot-image-content-part-v2` sit on real upstream history. The only remote is `origin`; local tags stop at v0.0.88. A read-only dry-run merge of upstream had no conflicts; upstream changed `mcp-tool-dispatch.ts`, `extension-protocol.ts`, `extension-handlers.ts`, `reload.ts`, `file-watcher.ts`, `mcp-setup.ts` and the CLI `config.ts` between v0.0.106 and v0.0.115, and the pending proposals cite the post-sync lines. The repo's lefthook hooks are not installed on this machine (a global `core.hooksPath` holds only a secret-scanning pre-commit), so no pre-push build or test runs and lockfiles are not auto-staged. The live server is a background daemon (`cli.js start --background`) that is not respawned when stopped, and `opentabs` is not on `PATH`.

Home-directory paths in public history: the user's own home-directory paths appear only in `CLAUDE.fork.md`, introduced by `a7b32d5c` and `d48adb44`, which are reachable only from `origin/f/fork-strategy-doc` and `origin/exec-branch` (no commit message contains them). Upstream's tree contains fictional example paths in tests and docs; those are not personal and are not touched. `git filter-repo` is not installed on this machine.

Screenshot work: upstream v0.0.115's `browser_screenshot_tab` already has the `filePath` option (base64 JSON by default, `{savedTo, bytes}` with `filePath`), so `f/restore-screenshot-tab-filepath` adds only a test. Upstream has no MCP image content part and no CLI image rendering, which `f/screenshot-image-content-part-v2` and `f/screenshot-tab-integrated` add. Whether that is worth carrying is decided by `rebase-screenshot-tab-branches`, not here.

## Goals / Non-Goals

**Goals:**
- Restore the documented invariants: `main` == upstream tag; fork work on `f/` branches; `exec-branch` current and live.
- Remove the user's home-directory paths from every ref the fork publishes.
- Lose no fork commit.
- Leave a verified, running system on current upstream code.

**Non-Goals:**
- Changing the fork strategy beyond the stacked-branch rule, the OpenSpec branch rule and placeholders below.
- Upstreaming any `f/` branch; tagging, versioning or publishing anything from the fork.
- Asking GitHub to purge cached objects, `refs/pull/*` or unreferenced commits (the user chose not to).
- Rewriting commits that are part of upstream's own history (they must stay identical so `main` equals the tag).
- Rebasing, recreating or merging the screenshot branches (moved to `rebase-screenshot-tab-branches`).
- Implementing the pending feature changes.

## Decisions

- **Follow the documented strategy rather than merging upstream into `main`.** A merge would keep fork commits on `main` and break the "never carry fork commits on main" rule.
- **Target the latest release tag (v0.0.115), not upstream `main`.** The commit after the tag is an automated version bump.
- **Add an `upstream` remote** and fetch its tags; verify the target with `git rev-parse v0.0.115^{commit}`.
- **Scrub history before rebasing (reverses the earlier "no rewrite" default).** In a fresh `git clone --mirror` of `origin` outside the repository, run `git filter-repo --replace-text <replacements-file>` mapping each existing home-directory path to `<primary-checkout>` or `<admin-worktree>`. The replacements file lives outside the repository and is never committed, because it contains the paths. Commits that neither contain a path nor descend from one keep their SHAs, so `b1e406d4`, `main` and every upstream commit are unchanged; only `a7b32d5c`, `d48adb44` and their descendants (`f/fork-strategy-doc`, `exec-branch`) are rewritten. The cleaned `f/fork-strategy-doc` is fetched back into the primary repository and the local branch reset to it, so the rebase in section 5 replays cleaned commits. The cleaned `exec-branch` is not used, because `exec-branch` is rebuilt from scratch. The mirror is never pushed wholesale (it holds read-only `refs/pull/*`); cleaned commits reach `origin` only through the normal per-branch force-pushes. Alternative: fix the paths in a new commit during the rebase; rejected because the rebased branch would still contain the path-bearing commits in its history.
- **Verification across all refs.** After the last force-push, a fresh (non-mirror) clone of `origin` is searched with `git log --all -G` and `git grep` over every ref for the home-directory prefixes; there must be no hits. The local repository is searched the same way over every ref except the backup tags.
- **Backup tags are local-only.** They hold the unscrubbed commits, so they are never pushed (no `git push --tags`, `push.followTags` checked off). The user deletes them later.
- **Old commits stay reachable on GitHub.** Unscrubbed commits remain fetchable by SHA and via `refs/pull/*` until GitHub garbage-collects them. The user chose not to request a purge; this is recorded and accepted.
- **Preserve fork-only commits as branches before resetting `main`.** `f/improve-approval-ui` from `472473fa`; `f/openspec` from `2347e3ec`'s `openspec/` scaffold plus this change folder only.
- **OpenSpec change folders travel with their implementation (reverses the earlier "all on `f/openspec`" default).** `f/openspec` holds the base `openspec/` scaffold and `sync-fork-with-upstream`, and is merged into `exec-branch`; this change is ticked and archived there. Each feature change folder is committed as the first commit of its own `f/` implementation branch, ticked and archived on that branch, and reaches `exec-branch` with its code. Until then the feature folders are kept in a holding folder outside the repository, because untracked copies in the primary checkout would block the switch to `exec-branch` once a branch tracks the same paths.
- **Rebase by base.** `f/fork-strategy-doc` (on `b1e406d4`) uses `git rebase --onto main b1e406d4`; `f/gitignore-superpowers` and `f/fork-readme` use `git rebase main`. Stacked branches use `git rebase --onto <new-base-tip> <old-base-tip> <branch>` and merge into `exec-branch` base first. This rule is added to `CLAUDE.fork.md`.
- **Screenshot branches left untouched.** `f/restore-screenshot-tab-filepath`, `f/screenshot-image-content-part-v2` and `f/screenshot-tab-integrated` are neither rebased, recreated nor force-pushed, and are not merged into the rebuilt `exec-branch`; their old tips are covered by the local backup tags. `rebase-screenshot-tab-branches`, sequenced last, gates on whether they still add functionality missing from upstream.
- **Free `main` before resetting it.** The primary checkout is detached (`git switch --detach`, which keeps files, untracked folders and `dist/`), then `main` is moved from the admin worktree with `git branch -f main v0.0.115` and pushed with `--force-with-lease=main:2347e3ec`.
- **Force-push only to `origin`, with explicit leases, after the user confirms each destructive push**, and after local backup tags on the old tips of `main`, `exec-branch` and every `origin/f/*`.
- **Rebuild `exec-branch` from scratch** with `git branch -f exec-branch main` (the branch-policy hook blocks `checkout -b exec-*`), merging no-ff, in order: `f/gitignore-superpowers`, `f/fork-readme`, `f/fork-strategy-doc`, `f/improve-approval-ui`, `f/openspec`. No screenshot branch is merged.
- **Verification precedes every push.** Nothing gates pushes on this machine, so the six checks run before any force-push of `exec-branch`; lockfiles are staged by hand.
- **Manual restart.** `node <primary-checkout>/platform/cli/dist/cli.js stop`, then `start --background`; verify with `cli.js status` and `extension_get_state`.
- **No machine paths in commits.** `CLAUDE.fork.md` edits use placeholders (`<primary-checkout>`, `<admin-worktree>`); the scrub has already replaced the existing paths.
- **Commit identity: keep the existing one.** Commits use the identity already configured on this machine (the fork owner's GitHub noreply address), not the identity named in the repo's `CLAUDE.md`. Task 1.5 only verifies it; no configuration change.

## Risks / Trade-offs

- [Force-push of `main` and the history scrub rewrite the fork's public history] -> local backup tags, explicit leases, fork only, user confirms each push.
- [Unscrubbed commits remain fetchable on GitHub by SHA or `refs/pull/*` until garbage-collected] -> accepted by the user; no purge requested.
- [Backup tags hold the unscrubbed paths] -> never pushed; the user deletes them after the sync is accepted.
- [The replacements file leaks the paths if committed] -> kept outside the repository and the mirror; never added to any commit.
- [Rewritten-history twins (`e98e58c4`, `fffc482a`) of upstream commits carry a personal author address] -> rewritten with a mailmap in the scrub (task 2.3a), which gives `b1e406d4` and its descendants new SHAs; upstream's originals are untouched, so `main` still equals the tag. The screenshot branches keep the old SHAs until `rebase-screenshot-tab-branches` runs, so they still reach the old twins until then.
- [Live screenshot tool loses the fork's image content part until `rebase-screenshot-tab-branches`] -> accepted; upstream's base64 and `filePath` modes remain.
- [Tool-name delimiter `__` breaks MCP client allow-lists, hooks and skills that name plugin tools] -> inventory and report; no edits (private config, not repo files).
- [Live server down during switch and restart] -> user-chosen time; pre-sync build recoverable via backup tags.

## Migration Plan

1. Upstream remote and tags, local backup tags, admin worktree, verify identity.
2. Scrub home-directory paths in a fresh mirror clone; reset local `f/fork-strategy-doc` to the cleaned commits.
3. Create `f/improve-approval-ui` and `f/openspec` (scaffold plus this change); move the feature change folders to the holding folder.
4. Detach the primary checkout; reset `main` to v0.0.115; user confirms; force-push.
5. Rebase the non-screenshot `f/` branches by base; update `CLAUDE.fork.md`; user confirms each force-push.
6. Rebuild `exec-branch` without the screenshot branches; verify; user confirms force-push.
7. Switch the live checkout to `exec-branch`, build, restart, reload extension, smoke test.
8. Verify no home-directory path remains in any ref on `origin`.
Rollback: reset `main` and `exec-branch` to the local backup tags and rebuild. Pushing a rolled-back `exec-branch` would republish the unscrubbed `CLAUDE.fork.md`, so a rollback push needs the scrub repeated first.

## Open Questions

Decisions recorded (round 3, from the user):

- Commit identity: keep the existing configured identity; verify only.
- History scrub: done with `git filter-repo --replace-text` before rebasing (reverses D6); backup tags local-only; no GitHub purge requested.
- OpenSpec location: `f/openspec` holds the scaffold and this change and is merged into `exec-branch`; feature change folders live on their own implementation branches (reverses D3).
- Screenshot branches: left untouched here; handled by `rebase-screenshot-tab-branches`, sequenced last (replaces D8).

Earlier defaults still in force:

- D1: the fork never tags, versions or publishes; `f/` branches may be pushed and opened as PRs for review only and are never merged into the fork's `main`.
- D2: `plugin-open-site-tab` is stacked on `approval-wait-visibility`; both merge into `exec-branch` in dependency order.
