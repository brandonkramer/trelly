import type { Command } from "commander";
import { getClient, parseKvPairs } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerLabelCommands(program: Command): void {
  const labels = program.command("labels").description("Label operations");

  labels.command("get <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.labelGet(id);
    }),
  );

  labels
    .command("create")
    .requiredOption("--board <boardId>", "Board id")
    .requiredOption("--name <name>", "Label name")
    .requiredOption("--color <color>", "Label color")
    .action((opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.labelCreate({
          idBoard: opts.board,
          name: opts.name,
          color: opts.color,
        });
      }),
    );

  labels
    .command("update <id>")
    .option("--params <kv...>", "key=value params")
    .action((id, opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.labelUpdate(id, parseKvPairs(opts.params));
      }),
    );

  labels.command("delete <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.labelDelete(id);
    }),
  );
}
