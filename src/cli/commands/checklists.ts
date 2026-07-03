import type { Command } from "commander";
import { getClient, parseKvPairs } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerChecklistCommands(program: Command): void {
  const checklists = program.command("checklists").description("Checklist operations");

  checklists.command("get <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.checklistGet(id);
    }),
  );

  checklists
    .command("create")
    .requiredOption("--card <cardId>", "Card id")
    .requiredOption("--name <name>", "Checklist name")
    .action((opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.checklistCreate({ idCard: opts.card, name: opts.name });
      }),
    );

  checklists
    .command("update <id>")
    .option("--params <kv...>", "key=value params")
    .action((id, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.checklistUpdate(id, parseKvPairs(opts.params));
      }),
    );

  checklists.command("delete <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.checklistDelete(id);
    }),
  );

  checklists
    .command("add-item <id>")
    .requiredOption("--name <name>", "Item name")
    .option("--checked", "Mark checked")
    .action((id, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.checklistAddItem(id, {
          name: opts.name,
          checked: opts.checked,
        });
      }),
    );

  checklists
    .command("update-item <checklistId> <itemId>")
    .option("--params <kv...>", "key=value params")
    .action((checklistId, itemId, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.checklistUpdateItem(
          checklistId,
          itemId,
          parseKvPairs(opts.params),
        );
      }),
    );

  checklists
    .command("delete-item <checklistId> <itemId>")
    .action((checklistId, itemId, _opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.checklistDeleteItem(checklistId, itemId);
      }),
    );
}
