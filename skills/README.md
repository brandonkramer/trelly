# trelly agent skills

Portable skills for AI agents (Cursor, Claude Code, Pi, Codex, etc.). Each skill is a
directory with a `SKILL.md` file (YAML frontmatter + markdown body).

| Skill | Use when |
|-------|----------|
| [trelly](trelly/SKILL.md) | Running or scripting the CLI (`trelly boards list`, auth, `--json`) |
| [trelly-mcp](trelly-mcp/SKILL.md) | Configuring or using the MCP server and Trello tools in an IDE agent |

## Install

**Source of truth:** this `skills/` folder in the repo.

### Cursor (project)

Symlink into `.cursor/skills/`:

```bash
mkdir -p .cursor/skills
ln -sf ../../skills/trelly .cursor/skills/trelly
ln -sf ../../skills/trelly-mcp .cursor/skills/trelly-mcp
```

Or copy the skill folders instead of symlinking.

### Cursor (global)

```bash
ln -sf ~/dev/trello-cli/skills/trelly ~/.cursor/skills/trelly
ln -sf ~/dev/trello-cli/skills/trelly-mcp ~/.cursor/skills/trelly-mcp
```

### Claude Code (project)

```bash
mkdir -p .claude/skills
ln -sf ../../skills/trelly .claude/skills/trelly
ln -sf ../../skills/trelly-mcp .claude/skills/trelly-mcp
```

### Claude Code (global)

```bash
ln -sf ~/dev/trello-cli/skills/trelly ~/.claude/skills/trelly
ln -sf ~/dev/trello-cli/skills/trelly-mcp ~/.claude/skills/trelly-mcp
```

### Pi

Add skill paths to your Pi config, or symlink into the skills directory your Pi setup
reads (often `~/.agents/lazy-skills/` or project-local `.pi/skills/`):

```bash
ln -sf ~/dev/trello-cli/skills/trelly ~/.agents/lazy-skills/trelly
ln -sf ~/dev/trello-cli/skills/trelly-mcp ~/.agents/lazy-skills/trelly-mcp
```

Adjust the target to match your Pi layout.

### Codex / other agents

- Point the agent at `skills/trelly/SKILL.md` or `skills/trelly-mcp/SKILL.md`, or
- Rely on repo-root [AGENTS.md](../AGENTS.md) for development conventions (Codex often
  reads AGENTS.md automatically).

## MCP config (separate from skills)

Skills teach agents *how* to use trelly. MCP wiring is in `~/.cursor/mcp.json` —
see [trelly-mcp/SKILL.md](trelly-mcp/SKILL.md) and [mcp.example.json](../mcp.example.json).
