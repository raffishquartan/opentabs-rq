## Skill comparison: `archive-correspondence` with and without the fork branch (2026-11-27)

Test page: a public, non-sensitive page (wikipedia.org home page), live server on `exec-branch` (version 0.0.115 plus this branch). No message content, names or paths with personal data are recorded.

| | Upstream baseline (task 1.3) | `exec-branch` with this branch |
|---|---|---|
| `filePath` mode: tool calls | 1 | 1 |
| `filePath` mode: result | `{savedTo, bytes}`, PNG complete | `{savedTo, bytes}`, PNG complete (262978 bytes, 1456 x 903) |
| Inline mode (no `filePath`) | 273862 bytes of base64 text in JSON; the model cannot see the image | an MCP image content part; the model sees the page directly |
| Failure modes seen | none | none (`image readback failed` did not occur) |

Findings:

- The PNG pixel size differs from the baseline (2912 x 1806 versus 1456 x 903) because the two captures used different windows and device pixel ratios, not because of the capture code: the `filePath` path is unchanged by this branch. The two captures are therefore not byte-comparable, and no quality difference is claimed.
- The skill's primary path (`browser_screenshot_tab` with `filePath`) behaves identically with and without the branch, so it does not produce better screenshots.
- The functional gain is the inline image: the agent can check a capture visually in one extra call, instead of receiving unreadable base64. That helps verification but the skill already verifies by reading the saved PNG, so no skill change is required.
- The skill text that says `filePath` needs the fork (`SKILL.md` line 252, fallback condition (a)) no longer holds: upstream v0.0.115 already supports `filePath`. Proposed wording change, not applied: say the primary path works on upstream v0.0.115 and later and on the fork, and drop fallback condition (a).
