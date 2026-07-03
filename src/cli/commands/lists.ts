import type { Command } from "commander";
import { getClient, parseKvPairs } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerListCommands(program: Command): void {
  const lists = program.command("lists").description("List (column) operations");

  lists.command("get <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.listGet(id);
    }),
  );

  lists
    .command("create")
    .requiredOption("--board <boardId>", "Board id")
    .requiredOption("--name <name>", "List name")
    .option("--pos <pos>", "Position")
    .action((opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.listCreate({
          idBoard: opts.board,
          name: opts.name,
          pos: opts.pos,
        });
      }),
    );

  lists
    .command("update <id>")
    .option("--params <kv...>", "key=value params")
    .action((id, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.listUpdate(id, parseKvPairs(opts.params));
      }),
    );

  lists.command("archive <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.listArchive(id);
    }),
  );

  lists.command("cards <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.listCards(id);
    }),
  );
}
