import type { Command } from "commander";
import { getClient } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerMemberCommands(program: Command): void {
  const members = program.command("members").description("Member operations");

  members.command("me").action((_opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.memberMe();
    }),
  );
}
