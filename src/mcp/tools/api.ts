import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JsonValue } from "../../api/client.ts";
import { profileField, runApi, toolEnvelopeSchema } from "../handlers.ts";

export function registerApiTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_api",
    {
      description:
        "Raw Trello REST escape hatch. path like /boards/{id}. Prefer specific tools when possible.",
      inputSchema: {
        profile: profileField,
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        path: z.string().min(1),
        query: z.record(z.string(), z.string()).optional(),
        body: z.unknown().optional(),
      },
      annotations: { destructiveHint: true },
      outputSchema,
    },
    async ({ profile, method, path, query, body }) =>
      runApi(profile, method, path, query, body as JsonValue | undefined),
  );
}
