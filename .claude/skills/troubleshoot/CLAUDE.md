# Troubleshoot Skill — Maintenance Guide

## File Structure

```
.claude/skills/troubleshoot/
├── SKILL.md          # Stub with frontmatter (loaded by AI clients at session start)
├── __SKILL__.md      # Actual skill content (read on-demand for latest version)
└── CLAUDE.md         # This file — maintenance instructions
```

## How It Works

AI clients load `SKILL.md` once at session start and cache its frontmatter + content in memory. To ensure the AI always gets the latest skill instructions (even if the skill was updated after the session started), `SKILL.md` is a lightweight stub that tells the AI to read `__SKILL__.md` at execution time.

- **`SKILL.md`**: Contains only the YAML frontmatter (name, description, triggers) and an instruction to read `__SKILL__.md`. Do NOT put actual skill logic here.
- **`__SKILL__.md`**: Contains the full skill instructions — the 8-step diagnostic workflow, error reference with 11 error types, diagnostic tools reference, and quick reference table. This is the file to edit when updating the skill.

## Updating the Skill

When you need to update the troubleshoot skill content:

1. **Edit `__SKILL__.md`** — this is the single source of truth for skill behavior
2. **Do NOT edit `SKILL.md`** unless you need to change the skill's name, description, or trigger keywords in the frontmatter
3. Changes to `__SKILL__.md` take effect immediately for any AI session that invokes the skill, since the AI reads it fresh each time

## Content Sources

This skill was created by combining two MCP server sources:

- **troubleshoot prompt** (`platform/mcp-server/src/prompts/troubleshoot.ts`) — 9-step diagnostic workflow (steps 1-8 preserved, step 9 "write learnings" replaced with self-update instructions)
- **troubleshooting resource** (`platform/mcp-server/src/resources/troubleshooting.ts`) — error reference with 11 error types (symptoms, causes, resolution steps), diagnostic tools reference

When discovering new error patterns or diagnostic techniques during troubleshooting, add them directly to `__SKILL__.md` in the appropriate section.
