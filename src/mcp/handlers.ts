import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { type JsonValue, type TrelloClient, TrelloError } from "../api/client.ts";
import { getClient } from "../cli/context.ts";

export const toolEnvelopeSchema = z.object({
  ok: z.boolean(),
  profile: z.string().optional(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  status: z.number().optional(),
  details: z.unknown().optional(),
});

export type ToolEnvelope = z.infer<typeof toolEnvelopeSchema>;

export const profileField = z.string().optional().describe("Auth profile name");

export function toolResult(envelope: ToolEnvelope): CallToolResult {
  return {
    structuredContent: envelope,
    content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
    isError: envelope.ok === false,
  };
}

export async function withClient<T>(
  profile: string | undefined,
  fn: (client: TrelloClient, profileName: string) => Promise<T>,
): Promise<CallToolResult> {
  try {
    const { profileName, client } = getClient(profile);
    const data = await fn(client, profileName);
    return toolResult({ ok: true, profile: profileName, data });
  } catch (err) {
    if (err instanceof TrelloError) {
      return toolResult({
        ok: false,
        error: err.message,
        status: err.status,
        details: err.body,
      });
    }
    return toolResult({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function runApi(
  profile: string | undefined,
  method: string,
  path: string,
  query: Record<string, string> | undefined,
  body: JsonValue | undefined,
): Promise<CallToolResult> {
  return withClient(profile, (client) =>
    client.request(method.toUpperCase(), path, query ?? {}, body),
  );
}
