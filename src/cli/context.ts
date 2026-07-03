import { createClient } from "../api/client.ts";
import { resolveProfile } from "../auth/profiles.ts";

export function getClient(profile?: string) {
  const { name, profile: creds } = resolveProfile(profile);
  return {
    profileName: name,
    client: createClient(creds.apiKey, creds.token),
  };
}

export type CliResult<T = unknown> = {
  ok: true;
  profile: string;
  data: T;
};

export type CliError = {
  ok: false;
  profile?: string;
  error: string;
  status?: number;
  details?: unknown;
};

export function success<T>(profile: string, data: T): CliResult<T> {
  return { ok: true, profile, data };
}

export function failure(
  error: string,
  extra: Omit<CliError, "ok" | "error"> = {},
): CliError {
  return { ok: false, error, ...extra };
}

export type OutputOptions = { json?: boolean; pretty?: boolean };

export function printResult(
  result: CliResult | CliError,
  opts: OutputOptions = {},
): void {
  if (opts.json) {
    const text = opts.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
    console.log(text);
    return;
  }
  void import("./ui/static.tsx").then(({ renderResult }) => renderResult(result));
}

export function parseKvPairs(pairs: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs ?? []) {
    const idx = pair.indexOf("=");
    if (idx <= 0) {
      throw new Error(`Invalid key=value pair: ${pair}`);
    }
    out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

export function parseJsonFlag(raw: string | undefined, label: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}
