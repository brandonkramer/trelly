import type { Command } from "commander";
import { TrelloError } from "../../api/client.ts";
import { failure, getClient, printResult, success } from "../context.ts";

export function rootOpts(cmd: Command): { profile?: string; pretty: boolean } {
  let node: Command | null = cmd;
  while (node?.parent) node = node.parent;
  return node?.opts() ?? {};
}

export async function run<T>(cmd: Command, fn: () => Promise<T>): Promise<void> {
  const opts = rootOpts(cmd);
  try {
    const { profileName } = getClient(opts.profile);
    const data = await fn();
    printResult(success(profileName, data), opts.pretty);
  } catch (err) {
    if (err instanceof TrelloError) {
      printResult(
        failure(err.message, { status: err.status, details: err.body }),
        opts.pretty,
      );
    } else {
      printResult(
        failure(err instanceof Error ? err.message : String(err)),
        opts.pretty,
      );
    }
    process.exitCode = 1;
  }
}
