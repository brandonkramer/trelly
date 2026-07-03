# trello-cli

Fast Trello CLI with **multi-profile auth** and an **MCP server** for Cursor / Codex / Claude / any MCP client.

TypeScript CLI run via `bin/run-ts` (**Bun** when available, otherwise **tsx** on Node 22+). Every command returns structured JSON (`{ ok, profile, data }`).

## Features

- Multiple named auth profiles (`personal`, `work`, …)
- Environment override via `TRELLO_API_KEY` + `TRELLO_TOKEN`
- Full coverage: boards, lists, cards, checklists, labels, custom fields, search, webhooks, members, orgs
- Raw REST escape hatch: `trello api --path /boards/{id} -X GET`
- MCP tools mirroring the CLI (plus `trello_api` for anything else)

## Install

```bash
cd ~/dev/trello-cli   # replace with your clone path
bun install           # Bun 1.2+; primary install path
```

`postinstall` automatically chmods `bin/trello`, `bin/trello-mcp`, and `bin/run-ts` — manual `chmod +x` is optional.

**No Bun?** Install with Node 22+ and tsx runs as fallback:

```bash
npm install           # keeps tsx in devDependencies for bin/run-ts
```

Optional global link:

```bash
bun link
# or add ~/dev/trello-cli/bin to PATH
```

## Auth (multi-profile)

**You do not need to copy tokens manually.** One-time app setup, then browser login.

### One-time setup (~2 min)

```bash
trello auth setup
```

This opens https://trello.com/power-ups/admin, walks you through creating a Power-Up API key, and asks you to add `http://127.0.0.1:14189` to **Allowed Origins** (required for automatic callback).

### Login (per profile)

Default login requests `read,write` scope with a **30-day** token expiration:

```bash
trello auth login                    # opens browser, captures token automatically
trello auth login --profile work     # second Trello account
trello auth login --manual           # fallback: paste token if redirect blocked
trello auth login --full-access      # read,write,account scope + never-expiring token
trello auth url                      # print browser authorization URL (no login)
```

Non-interactive (CI/scripts):

```bash
trello auth setup --api-key KEY
trello auth login --api-key KEY --token TOKEN --profile ci
```

```bash
trello auth list
trello auth use work
trello auth logout --profile work
```

Credentials live at `~/.config/trello-cli/config.json` (mode `600`).

The **API key** is tied to your Power-Up (one-time). The **token** is per user/account and is obtained via browser — no manual copy unless you use `--manual`.

### Environment auth

```bash
export TRELLO_APP_API_KEY=...   # optional shared app key
export TRELLO_API_KEY=...       # per-request override
export TRELLO_TOKEN=...
export TRELLO_PROFILE=work
```

## CLI examples

```bash
trello --pretty boards list
trello --profile work boards lists BOARD_ID
trello cards create --list LIST_ID --name "Ship feature" --desc "Details"
trello cards move CARD_ID --list DONE_LIST_ID
trello cards comment CARD_ID --text "Done in PR #42"
trello search "customer onboarding"
trello webhooks list
trello api -X PUT --path /cards/CARD_ID --query idList=LIST_ID
```

Global flags:

- `-p, --profile <name>` — auth profile
- `--pretty` — indented JSON

### Archive vs delete

**Archive** closes an item — reversible in the Trello UI. **Delete** is permanent.

| Action | CLI | Effect |
|--------|-----|--------|
| Close (safe) | `trello cards archive CARD_ID` | Reversible |
| Close (safe) | `trello boards archive BOARD_ID` | Reversible |
| Permanent | `trello cards delete CARD_ID` | Irreversible |
| Permanent | `trello boards delete BOARD_ID` | Irreversible |

Prefer archive unless you explicitly need to destroy data.

## MCP (Cursor)

See `mcp.example.json` in the repo root. Add to `~/.cursor/mcp.json` (replace the path with your clone):

```json
"trello-cli": {
  "command": "$HOME/dev/trello-cli/bin/trello-mcp",
  "env": {
    "TRELLO_PROFILE": "default"
  }
}
```

Restart Cursor. Available tools include `trello_boards_list`, `trello_card_create`, `trello_card_archive`, `trello_board_archive`, `trello_search`, `trello_api`, etc.

Use `profile` on any MCP tool to target a non-default account.

**For agents:** prefer `trello_card_archive` / `trello_board_archive` to close items safely. `trello_card_delete` is **permanent and irreversible** — there is no MCP board-delete tool.

## Development

Stack: Bun, TypeScript 6, Biome, Commander 15, Zod 4, MCP SDK 1.29 (tsx kept for Node fallback).

```bash
bun install
bun run typecheck
bun test
bun run lint          # Biome
bun run fmt           # format
bun run fmt:check     # format check (CI)
bun run mcp           # stdio MCP server (manual testing)
bun run trello -- auth list
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, and tests via `bun install --frozen-lockfile`.

## License

MIT
