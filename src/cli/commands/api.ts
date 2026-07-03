import type { Command } from "commander";
import type { JsonValue } from "../../api/client.ts";
import { TrelloError } from "../../api/client.ts";
import {
  failure,
  getClient,
  parseJsonFlag,
  parseKvPairs,
  printResult,
  success,
} from "../context.ts";
import { rootOpts } from "./run.ts";

export function registerApiCommand(program: Command): void {
  program
    .command("api")
    .description("Raw Trello REST call (escape hatch)")
    .requiredOption("-X, --method <method>", "HTTP method")
    .requiredOption("--path <path>", "API path e.g. /boards/{id}")
    .option("--query <kv...>", "Query key=value pairs")
    .option("--body <json>", "JSON request body")
    .action(async (opts, cmd) => {
      const root = rootOpts(cmd);
      try {
        const { profileName, client } = getClient(root.profile);
        const body = parseJsonFlag(opts.body, "--body");
        const data = await client.request(
          opts.method,
          opts.path,
          parseKvPairs(opts.query),
          body as JsonValue | undefined,
        );
        printResult(success(profileName, data), root);
      } catch (err) {
        if (err instanceof TrelloError) {
          printResult(
            failure(err.message, { status: err.status, details: err.body }),
            root,
          );
        } else {
          printResult(failure(err instanceof Error ? err.message : String(err)), root);
        }
        process.exitCode = 1;
      }
    });
}
