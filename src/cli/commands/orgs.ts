import type { Command } from "commander";
import { getClient } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerOrgCommands(program: Command): void {
  const orgs = program
    .command("orgs")
    .description("Workspace (organization) operations");

  orgs.command("get <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.orgGet(id);
    }),
  );

  orgs.command("boards <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.orgBoards(id);
    }),
  );
}
