import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { profileField, toolEnvelopeSchema, withClient } from "../handlers.ts";

export function registerLabelTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_label_create",
    {
      description: "Create a board label.",
      inputSchema: {
        profile: profileField,
        boardId: z.string().min(1),
        name: z.string().min(1),
        color: z.string().min(1),
      },
      outputSchema,
    },
    async ({ profile, boardId, name, color }) =>
      withClient(profile, (client) =>
        client.labelCreate({ idBoard: boardId, name, color }),
      ),
  );

  server.registerTool(
    "trello_card_add_label",
    {
      description: "Add a label to a card.",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        labelId: z.string().min(1),
      },
      outputSchema,
    },
    async ({ profile, cardId, labelId }) =>
      withClient(profile, (client) => client.cardAddLabel(cardId, labelId)),
  );
}
