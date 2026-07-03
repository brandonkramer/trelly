import type { Command } from "commander";
import { getClient } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerActionCommands(program: Command): void {
  const actions = program.command("actions").description("Action (audit) operations");

  actions
    .command("get <id>")
    .description("Get an action by id")
    .action((id, _opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.actionGet(id);
      }),
    );
}
