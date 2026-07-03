import type { Command } from "commander";
import { getClient } from "../context.ts";
import { rootOpts, run } from "./run.ts";

export function registerWebhookCommands(program: Command): void {
  const webhooks = program.command("webhooks").description("Webhook operations");

  webhooks.command("list").action((_opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.webhooksForToken();
    }),
  );

  webhooks
    .command("create")
    .requiredOption("--callback <url>", "Callback URL")
    .requiredOption("--id-model <id>", "Board or card id to watch")
    .option("--desc <desc>", "Description")
    .action((opts, cmd) =>
      run(cmd, async () => {
        const { client } = getClient(rootOpts(cmd).profile);
        return client.webhookCreate({
          callbackURL: opts.callback,
          idModel: opts.idModel,
          description: opts.desc,
        });
      }),
    );

  webhooks.command("get <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.webhookGet(id);
    }),
  );

  webhooks.command("delete <id>").action((id, _opts, cmd) =>
    run(cmd, async () => {
      const { client } = getClient(rootOpts(cmd).profile);
      return client.webhookDelete(id);
    }),
  );
}
