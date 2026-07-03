# trelly

Fast Trello CLI + MCP server ([npm](https://www.npmjs.com/package/trelly): `npm install -g trelly`).
**Human, Trello-styled output by default**; add `--json` for scripts and automation.
Commands: **`trello`** or **`trelly`** (same binary).

![trelly interactive UI](cli.gif)

Boards, lists, cards, checklists, labels, custom fields, search, webhooks, multi-profile
auth, interactive kanban TUI, raw `trello api` escape hatch.

## Quick start

```bash
npm install -g trelly
trelly auth setup    # once: API key from power-ups/admin
trelly auth login    # browser → Allow
trelly boards list
```

From source (repo [brandonkramer/trello-cli](https://github.com/brandonkramer/trello-cli)):

```bash
git clone https://github.com/brandonkramer/trello-cli.git && cd trello-cli
bun install
./bin/trello auth setup
./bin/trello auth login
./bin/trello boards list
```

No Bun? `npm install` in the clone — tsx is the fallback runtime.

Optional: `bun link` / `npm link`, or add `bin/` to `PATH`.

## Output

| Mode | Command | stdout |
|------|---------|--------|
| Default | `trello boards list` | Styled rows (labels, due badges, etc.) |
| JSON | `trello --json boards list` | `{ ok, profile, data }` |
| Pretty JSON | `trello --json --pretty boards list` | Indented envelope |

- **Errors:** red `✗ message` in human mode, exit code `1` (use `--json` for `{ ok: false, ... }`).
- **Pipes:** colors auto-disable when stdout is not a TTY.
- **Scripts:** always pass `--json` if you parse stdout. The MCP server is unchanged (never uses CLI output).

## Interactive UI

Bare **`trello`** / **`trelly`** (no subcommand) opens the Ink kanban board in your terminal — same as `trello ui`.

```bash
trello              # board picker when no id given
trello ui           # same
trello ui BOARD_ID  # jump straight to a board
```

Requires a TTY. Keys: **arrows** / **hjkl** move focus, **Enter** card detail, **r** refresh, **q** / **Esc** back or quit.

See the demo above or run `trelly --help` for all subcommands.

## Auth

Two steps: **API key** (app identity, once) → **token** (your account, per profile).

Register a throwaway app at [power-ups/admin](https://trello.com/power-ups/admin) — you are **not** installing a Power-Up on your boards. Pick any workspace you **admin** (personal is fine); that choice does not limit which boards you can use. Iframe URL can be any `https://` placeholder (e.g. `https://example.com`). Add `http://127.0.0.1:14189` to **Allowed Origins** for automatic browser login.

After login the CLI is **you** on Trello — same boards and permissions as the website.

```bash
trelly auth setup
trelly auth login
trelly auth login --profile work
trelly auth login --manual              # paste token if redirect blocked
trelly auth login --full-access         # never-expiring token
trelly auth list
trelly auth use work
trelly auth logout --profile work
trelly auth url
```

Non-interactive: `trelly auth setup --api-key KEY` then `trelly auth login --api-key KEY --token TOKEN`.

Environment override: `TRELLO_APP_API_KEY`, `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_PROFILE`.

Credentials: `~/.config/trelly/config.json` (mode `600`). Migrates automatically from
`~/.config/trello-cli/config.json` on next save.

## Usage

```bash
trelly boards list
trelly --json --pretty boards list | jq '.data[].name'
trelly --profile work boards lists BOARD_ID
trelly cards create --list LIST_ID --name "Ship feature"
trelly cards comments CARD_ID
trelly cards comment CARD_ID --text "Shipped"
trelly search "customer onboarding"
trelly api -X PUT --path /cards/CARD_ID --query idList=LIST_ID
trelly api -X POST --path /cards --body '{"idList":"LIST_ID","name":"Hi"}'
```

Flags: `-p, --profile <name>`, `--json`, `--pretty` (with `--json` only).

**Archive** (reversible) vs **delete** (permanent): prefer `cards archive` / `boards archive` over `cards delete` / `boards delete`.

### Command reference

Top-level: `auth` · `boards` · `lists` · `cards` · `checklists` · `labels` · `custom-fields` · `search` · `webhooks` · `members` · `orgs` · `actions` · `api` · `ui`

| Group | Subcommands |
|-------|-------------|
| **auth** | `setup` · `login` · `list` · `use` · `logout` · `url` |
| **boards** | `list` · `get` · `create` · `update` · `archive` · `delete` · `lists` · `cards` · `labels` · `members` · `actions` · `custom-fields` |
| **lists** | `get` · `create` · `update` · `archive` · `cards` |
| **cards** | `get` · `list` · `create` · `update` · `move` · `comments` · `comment` · `archive` · `delete` · `members` · `add-member` · `remove-member` · `labels` · `add-label` · `remove-label` · `actions` · `attachments` · `add-attachment` · `custom-fields` |
| **checklists** | `get` · `create` · `update` · `delete` · `add-item` · `update-item` · `delete-item` |
| **labels** | `get` · `create` · `update` · `delete` |
| **custom-fields** | `get` · `create` · `update` · `delete` · `set-item` |
| **search** | `<query>` (`--model-types`, limits) |
| **webhooks** | `list` · `create` · `get` · `delete` |
| **members** | `me` |
| **orgs** | `get` · `boards` |
| **actions** | `get` |
| **api** | raw REST (`-X`, `--path`, `--query`, `--body`) |
| **ui** | `[boardId]` — or run bare `trello` / `trelly` |

List-type custom field values: use `trelly api` with `PUT /cards/{id}/customField/{fieldId}/item` and `{"idValue":"..."}` (see [skills/trelly/SKILL.md](skills/trelly/SKILL.md)).

Per-subcommand flags: `trelly <group> --help`. Curated examples and agent guidance: [skills/trelly/SKILL.md](skills/trelly/SKILL.md).

## MCP

Add to `~/.cursor/mcp.json` (see `mcp.example.json`):

```json
"trelly": {
  "command": "trello-mcp",
  "env": { "TRELLO_PROFILE": "default" }
}
```

After `npm install -g trelly`, `trello-mcp` is on your PATH. From a clone, use the full path to `bin/trello-mcp`.

Stdio server — JSON envelope on every tool (`{ ok, profile, data }`), never CLI human output. Pass **`profile`** on any tool for a non-default account. Prefer **`trello_*_archive`** over **`trello_card_delete`** (permanent; no board-delete MCP tool).

### MCP tools (27)

| Tool | Purpose |
|------|---------|
| `trello_profiles_list` | Saved profiles + default |
| `trello_member_me` | Authenticated member |
| `trello_boards_list` | Member boards |
| `trello_board_get` | Board by id |
| `trello_board_create` | Create board |
| `trello_board_archive` | Close board (reversible) |
| `trello_board_lists` | Lists on board |
| `trello_board_cards` | All cards on board |
| `trello_list_create` | Create list |
| `trello_list_cards` | Cards in list |
| `trello_card_get` | Card by id |
| `trello_card_create` | Create card |
| `trello_card_update` | Update card fields |
| `trello_card_move` | Move to another list |
| `trello_card_comments` | List comments |
| `trello_card_comment` | Add comment |
| `trello_card_archive` | Close card (reversible) |
| `trello_card_delete` | **Permanent** delete |
| `trello_checklist_create` | Checklist on card |
| `trello_checklist_add_item` | Checklist item |
| `trello_label_create` | Board label |
| `trello_card_add_label` | Label on card |
| `trello_search` | Search Trello |
| `trello_webhooks_list` | Token webhooks |
| `trello_webhook_create` | Create webhook |
| `trello_webhook_delete` | Delete webhook |
| `trello_api` | Raw REST escape hatch |

Full tool notes and MCP vs CLI guidance: [skills/trelly-mcp/SKILL.md](skills/trelly-mcp/SKILL.md).

## Development

```bash
bun run typecheck && bun test && bun run lint
```

CI runs the same via `bun install --frozen-lockfile`. See `AGENTS.md` for conventions.

**Agent skills:** [skills/](skills/README.md) — portable `SKILL.md` files for Cursor, Claude, Pi, Codex (`trelly`, `trelly-mcp`).

## License

MIT
