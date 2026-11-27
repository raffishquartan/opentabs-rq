## 1. Fix

- [x] 1.1 Add `!.worktrees` to `files.includes` in `biome.json` and `/.worktrees/` to `.gitignore`. Verify: primary-checkout lint and an in-worktree lint and format check all exit 0 with a worktree present.
- [ ] 1.4 Add `cc-sessions/**` to `ignore` in `knip.ts`. Verify: `npm run knip` exits 0 in the primary checkout with stub files present under `cc-sessions/`.
- [ ] 1.2 Push the branch (pre-push hook passes) and merge it into every other feature branch and into `exec-branch`. Verify: `git merge-base --is-ancestor f/biome-ignore-worktrees <branch>` holds for each.
- [ ] 1.3 Record the rule in `CLAUDE.fork.md`: every new feature branch also merges `f/biome-ignore-worktrees`, and worktrees may live under `.worktrees/`.
