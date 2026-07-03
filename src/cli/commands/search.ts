import type { Command } from "commander";
import { getClient } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerSearchCommands(program: Command): void {
  program
    .command("search")
    .description("Search boards, cards, members, and actions")
    .argument("<query>", "Search query")
    .option("--model-types <types>", "Comma-separated: cards,boards,members,...")
    .option("--cards-limit <n>", "Max cards")
    .option("--boards-limit <n>", "Max boards")
    .action((query, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.search(query, {
          modelTypes: opts.modelTypes,
          cards_limit: opts.cardsLimit,
          boards_limit: opts.boardsLimit,
        });
      }),
    );
}
