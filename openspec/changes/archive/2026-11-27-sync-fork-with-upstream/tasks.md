## 1. Prepare

- [x] 1.1 With user confirmation (it holds an uncommitted merge), remove the planning preview worktree with `git worktree remove --force` and its branch `f/post-sync-preview`; verify `git worktree list` shows no preview entry.
- [x] 1.2 `git remote add upstream https://github.com/opentabs-dev/opentabs.git` and `git fetch upstream --tags`; verify `git rev-parse v0.0.115^{commit}` is `260bc756...`.
- [x] 1.3 Create local backup tags on the current tips of `main`, `exec-branch` and every `origin/f/*`; never push them (no `git push --tags`; confirm `git config push.followTags` is not `true`). Verify with `git tag -l`, `git rev-parse`, and `git ls-remote --tags origin` showing none of them.
- [x] 1.4 Create the admin worktree at `<repo>/.worktrees/<name>` on an `f/` branch name; verify `git worktree list`.
- [x] 1.5 Verify the commit identity is the existing configured one (the fork owner's GitHub noreply address, per the user's decision); no configuration change. Verify: `git config user.name` and `user.email` in the admin worktree match it.

## 2. Scrub home-directory paths from history

- [x] 2.1 With user confirmation, install `git filter-repo`. Verify: `git filter-repo --version` succeeds.
- [x] 2.2 Write a replacements file outside the repository mapping each home-directory path found in `CLAUDE.fork.md` on `origin/f/fork-strategy-doc` to `<primary-checkout>` or `<admin-worktree>` (literal `old==>new` lines). Verify: `git log --all -G '<prefixes>'` in the primary repository lists only `a7b32d5c` and `d48adb44`, and every path in their diffs has a mapping; the file is not inside any repository.
- [x] 2.3 `git clone --mirror` the fork's `origin` into a folder outside the repository and run `git filter-repo --replace-text <replacements-file>` there. Verify in the mirror: `git log --all -G '<prefixes>'` (excluding `refs/pull/*`) has no hits; `b1e406d4`, `2347e3ec` and every `refs/heads/*` other than `f/fork-strategy-doc` and `exec-branch` keep their SHAs.
- [x] 2.3a Author-address scrub (user decision 2026-11-26): only the fork's own rewritten copies of upstream commits `bd0ea870` and `cf08fffc` (the copies `e98e58c4` and `fffc482a` below `b1e406d4`) are rewritten with `git filter-repo --mailmap <mailmap-file>` in the same mirror, mapping the personal author address to the fork owner's GitHub noreply identity; the mailmap file lives outside any repository and is never committed. Upstream's originals stay untouched, so `main` still equals the tag. Because the copies sit below `b1e406d4`, that commit and all descendants get new SHAs: record the new `b1e406d4` equivalent and use it as the `--onto` base in sections 4 and 5. Verify: `git log --all --format='%ae' | sort -u` in the mirror (excluding `refs/pull/*` and upstream-tag ancestry) lists no personal address; the new base's tree equals the tree of `42e0df9b`.
- [x] 2.4 Fetch the cleaned `f/fork-strategy-doc` from the mirror into the primary repository under a temporary ref and reset local `f/fork-strategy-doc` to it in the admin worktree. Do not push the mirror. Verify: `git diff origin/f/fork-strategy-doc f/fork-strategy-doc` changes only path strings in `CLAUDE.fork.md`; `git merge-base f/fork-strategy-doc b1e406d4` is `b1e406d4`.

## 3. Preserve fork-only work

- [x] 3.1 Create `f/improve-approval-ui` with the approval dialog fix on top of v0.0.115; verify its diff against the tag matches the diff of `472473fa` and its tests pass.
- [x] 3.2 Create `f/openspec` on top of v0.0.115 with `openspec/config.yaml` and the `sync-fork-with-upstream` change folder only; verify the diff is only `openspec/` and the privacy grep over it has no hits. It is merged into `exec-branch`; this change is ticked and archived on it.
- [x] 3.3 Move (never delete) the other change folders (`fix-whatsapp-list-messages`, `approval-wait-visibility`, `plugin-open-site-tab`, `mcp-rate-limit-retryable-status`, `rebase-screenshot-tab-branches`) from the primary checkout's `openspec/changes/` to a holding folder outside the repository. Verify: each folder is present in the holding folder and absent from the primary checkout; each feature change's first task commits its folder from there.

## 4. Reset main (destructive; needs explicit user confirmation)

- [x] 4.1 Show the user the exact commands and the commits that leave `main`; obtain confirmation.
- [x] 4.2 Detach the primary checkout with `git -C <primary-checkout> switch --detach` (files, untracked folders and `dist/` unchanged); verify `git -C <primary-checkout> branch --show-current` is empty and the server still answers.
- [x] 4.3 From the admin worktree, `git branch -f main v0.0.115` and `git push origin main --force-with-lease=main:2347e3ec`; verify `git diff main v0.0.115` is empty and `origin/main` equals the tag.

## 5. Rebase and rebuild

- [x] 5.1 Rebase the cleaned `f/fork-strategy-doc` with `git rebase --onto main b1e406d4 f/fork-strategy-doc`; rebase `f/gitignore-superpowers` and `f/fork-readme` with `git rebase main`, resolving conflicts. Leave `f/restore-screenshot-tab-filepath`, `f/screenshot-image-content-part-v2` and `f/screenshot-tab-integrated` untouched (no rebase, no push). Verify `git rev-list --count main..<branch>` is 1 for each rebased branch (2 for `f/fork-strategy-doc`), each builds and its own tests pass, and the three screenshot branches still equal their backup tags.
- [x] 5.2 On the rebased `f/fork-strategy-doc`, update `CLAUDE.fork.md` with the new snapshot, the stacked-branch rebase rule (`git rebase --onto <new-base> <old-base> <branch>`, merge base first), the OpenSpec rule (scaffold on `f/openspec`, merged into `exec-branch`; each change folder committed on its own implementation branch), the local-only backup-tag rule, the manual restart, the screenshot branches being set aside pending `rebase-screenshot-tab-branches`, and the lesson that fork changes are never committed to `main`. Use placeholders (`<primary-checkout>`, `<admin-worktree>`). Verify: a `git grep` on the branch for the home-directory prefixes has no hits, then diff review with the user before the push in 5.4.
- [x] 5.3 Inventory references to old plugin tool names (`mcp__opentabs__<plugin>_<tool>`) in the user's Claude Code settings (user and project `settings*.json` permission entries), hooks and skills; verify a list is reported to the user (no edits; private config).
- [x] 5.4 Force-push each rebased `f/` branch, and push the new `f/improve-approval-ui` and `f/openspec`, after per-branch user confirmation, with `--force-with-lease=<branch>:<old-tip>` where a remote branch exists; verify each remote tip equals its local tip.
- [x] 5.5 Rebuild `exec-branch` with `git branch -f exec-branch main` from the admin worktree, then no-ff merge `f/gitignore-superpowers`, `f/fork-readme`, `f/fork-strategy-doc`, `f/improve-approval-ui` and `f/openspec`, in that order; no screenshot branch. Verify `git log --first-parent main..exec-branch` lists exactly those five merges.

## 6. Verify and switch

- [x] 6.1 On the rebuilt `exec-branch` run `npm run build`, `type-check`, `lint`, `knip`, `test`, `test:e2e`; verify every command exits 0 before any push (no hook gates pushes on this machine); stage any changed lockfiles by hand.
- [x] 6.2 Obtain user confirmation, then force-push `exec-branch` with `--force-with-lease=exec-branch:<old-tip>`; verify the remote tip.
- [x] 6.3 Switch the primary checkout to `exec-branch`, `npm run build`, then `node <primary-checkout>/platform/cli/dist/cli.js stop` and `start --background` (the daemon is not respawned automatically); reload the extension at `chrome://extensions/`. Verify `cli.js status`, `extension_get_state`, and one tool call per category (plugin, browser); `git -C <primary-checkout> status` shows the switch succeeded with no untracked `openspec/changes/` folders blocking it.
- [x] 6.4 Verify the scrub on the published fork: in a fresh, non-mirror clone of `origin` outside the repository, `git log --all -G '<prefixes>'` and `git grep -E '<prefixes>' $(git for-each-ref --format='%(refname)')` have no hits; in the primary repository the same searches over every ref except the backup tags have no hits. Report to the user that unscrubbed commits remain fetchable on GitHub by SHA and `refs/pull/*` until GitHub garbage-collects them, and that no purge was requested.
