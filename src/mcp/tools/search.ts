import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { profileField, toolEnvelopeSchema, withClient } from "../handlers.ts";

export function registerSearchTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_search",
    {
      description: "Search Trello for cards, boards, members, and actions.",
      inputSchema: {
        profile: profileField,
        query: z.string().min(1),
        modelTypes: z.string().optional(),
        cardsLimit: z.number().int().positive().optional(),
        boardsLimit: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, query, modelTypes, cardsLimit, boardsLimit }) =>
      withClient(profile, (client) =>
        client.search(query, {
          modelTypes,
          cards_limit: cardsLimit,
          boards_limit: boardsLimit,
        }),
      ),
  );
}
