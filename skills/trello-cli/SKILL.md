---
name: trello-cli
description: >-
  Operate the trello-cli Trello command-line tool: auth setup/login, human vs --json
  output, boards/lists/cards, search, trello ui, trello api. Use when the user asks to
  run trello commands, script Trello from the terminal, manage boards as themselves, or
  automate Trello with trello-cli.
---

# trello-cli

Fast Trello CLI. **Human Trello-styled output by default**; **`--json` for scripts**.

## Prerequisites

```bash
cd /path/to/trello-cli && bun install
./bin/trello auth setup    # once: API key from https://trello.com/power-ups/admin
./bin/trello auth login    # browser Allow → saves token
```

Auth notes (common confusion):

- Power-Up admin is **developer registration**, not installing a Power-Up on a board.
- Pick any workspace you **admin** (personal is fine) — does not limit which boards you can use.
- After login the CLI is **you** on Trello (member permissions, not board admin).

Credentials: `~/.config/trello-cli/config.json` (never read/log/commit).

## Output contract

| Goal | Flags |
|------|--------|
| Human (default) | *(none)* |
| JSON envelope | `--json` → `{ ok, profile, data }` or `{ ok: false, error, ... }` |
| Pretty JSON | `--json --pretty` |

- **Scripts:** always `--json` if parsing stdout.
- **`--pretty` alone** does not emit JSON; it only indents `--json` output.
- Errors: red `✗` in human mode; exit code `1`.

## Common commands

```bash
./bin/trello boards list
./bin/trello --json boards list | jq '.data[].name'
./bin/trello boards lists BOARD_ID
./bin/trello boards cards BOARD_ID          # or: api GET /boards/{id}/cards
./bin/trello lists cards LIST_ID
./bin/trello cards get CARD_ID --fields name,desc
./bin/trello cards comments CARD_ID
./bin/trello cards create --list LIST_ID --name "Task"
./bin/trello cards move CARD_ID --list OTHER_LIST_ID
./bin/trello cards comment CARD_ID --text "Done"
./bin/trello search "query"
./bin/trello ui BOARD_ID                    # interactive kanban (TTY required)
./bin/trello auth list
```

Global: `-p, --profile <name>` (or `TRELLO_PROFILE`).

## Raw API escape hatch

```bash
./bin/trello api -X GET --path /members/me
./bin/trello api -X PUT --path /cards/CARD_ID --query idList=LIST_ID
./bin/trello api -X POST --path /cards --body '{"idList":"LIST_ID","name":"Hi"}'
```

Request body flag is **`--body`** (not `--json` — that flag is global output).

## Custom fields (list-type)

```bash
./bin/trello api -X PUT \
  --path "/cards/CARD_ID/customField/FIELD_ID/item" \
  --body '{"idValue":"OPTION_ID"}'
```

## Safety

| Action | CLI | Reversible? |
|--------|-----|-------------|
| Close | `cards archive`, `boards archive` | Yes (Trello UI) |
| Destroy | `cards delete`, `boards delete` | **No** |

Prefer **archive** unless the user explicitly wants permanent deletion.

## Multi-profile

```bash
./bin/trello auth login --profile work
./bin/trello -p work boards list
```

Env override: `TRELLO_APP_API_KEY`, `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_PROFILE`.

## MCP vs CLI

- **CLI:** human or `--json` on stdout.
- **MCP:** separate stdio server (`bin/trello-mcp`) — see **trello-mcp** skill.
