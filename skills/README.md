# trello-cli agent skills

Portable skills for AI agents (Cursor, Claude Code, Pi, Codex, etc.). Each skill is a
directory with a `SKILL.md` file (YAML frontmatter + markdown body).

| Skill | Use when |
|-------|----------|
| [trello-cli](trello-cli/SKILL.md) | Running or scripting the CLI (`trello boards list`, auth, `--json`) |
| [trello-mcp](trello-mcp/SKILL.md) | Configuring or using the MCP server and Trello tools in an IDE agent |

## Install

**Source of truth:** this `skills/` folder in the repo.

### Cursor (project)

Symlink into `.cursor/skills/` (already wired in this repo):

```bash
mkdir -p .cursor/skills
ln -sf ../../skills/trello-cli .cursor/skills/trello-cli
ln -sf ../../skills/trello-mcp .cursor/skills/trello-mcp
```

Or copy the skill folders instead of symlinking.

### Cursor (global)

```bash
ln -sf ~/dev/trello-cli/skills/trello-cli ~/.cursor/skills/trello-cli
ln -sf ~/dev/trello-cli/skills/trello-mcp ~/.cursor/skills/trello-mcp
```

### Claude Code (project)

```bash
mkdir -p .claude/skills
ln -sf ../../skills/trello-cli .claude/skills/trello-cli
ln -sf ../../skills/trello-mcp .claude/skills/trello-mcp
```

### Claude Code (global)

```bash
ln -sf ~/dev/trello-cli/skills/trello-cli ~/.claude/skills/trello-cli
ln -sf ~/dev/trello-cli/skills/trello-mcp ~/.claude/skills/trello-mcp
```

### Pi

Add skill paths to your Pi config, or symlink into the skills directory your Pi setup
reads (often `~/.agents/lazy-skills/` or project-local `.pi/skills/`):

```bash
ln -sf ~/dev/trello-cli/skills/trello-cli ~/.agents/lazy-skills/trello-cli
ln -sf ~/dev/trello-cli/skills/trello-mcp ~/.agents/lazy-skills/trello-mcp
```

Adjust the target to match your Pi layout.

### Codex / other agents

- Point the agent at `skills/trello-cli/SKILL.md` or `skills/trello-mcp/SKILL.md`, or
- Rely on repo-root [AGENTS.md](../AGENTS.md) for development conventions (Codex often
  reads AGENTS.md automatically).

## MCP config (separate from skills)

Skills teach agents *how* to use trello-cli. MCP wiring is in `~/.cursor/mcp.json` —
see [trello-mcp/SKILL.md](trello-mcp/SKILL.md) and [mcp.example.json](../mcp.example.json).
