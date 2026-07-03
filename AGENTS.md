# AGENTS.md

trello-cli — Trello CLI + MCP stdio server. TypeScript, run with **Bun**
(`bin/run-ts` falls back to tsx/Node; CI runs the same checks via npm on Node 22).
All output is a JSON envelope: `{ ok, profile, data }` /
`{ ok: false, error, status?, details? }`.

## Layout

- `src/api/` — `http.ts` (30s timeout, 429 retry), `client.ts` (one method per endpoint)
- `src/auth/` — profiles in `~/.config/trello-cli/config.json`, loopback browser flow
- `src/cli/` — commander program: `index.ts`, `context.ts`, `commands/`
- `src/mcp/` — `server.ts`, `tools/` (tool registrations), `handlers.ts`
- `bin/` — bash launchers: `trello`, `trello-mcp`

## Commands

```bash
bun install
bun run typecheck   # tsc --noEmit
bun test
bun run lint        # biome check .
./bin/trello --help
```

Run all three checks before committing.

## Rules

- Biome style (double quotes, 2-space indent, 88 cols); TS strict; `import type`
  for types; explicit `.ts` import extensions; named exports only
- CLI: JSON on stdout, logs/prompts on stderr, `process.exitCode = 1` on failure.
  MCP server: never write to stdout (stdio transport)
- New MCP tools go in `src/mcp/tools/` (by resource): zod input schema, envelope
  `outputSchema`, `readOnlyHint`/`destructiveHint` annotations
- `*_archive` = `PUT closed=true` (reversible); `*_delete` = permanent —
  descriptions must say which
- Never read, log, or commit credentials (`~/.config/trello-cli/config.json`);
  auth goes in the `Authorization` header, never in URLs
- No live Trello API calls in tests; package is `private` — never publish

## Commits & PRs

- Conventional commits (`feat:`, `fix:`, `chore:`, …), imperative, subject ≤72 chars
- Branch `type/short-description` off `main`; one logical change per PR; say how
  you verified it
- Never force-push `main`
