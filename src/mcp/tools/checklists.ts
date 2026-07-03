import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { profileField, toolEnvelopeSchema, withClient } from "../handlers.ts";

export function registerChecklistTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_checklist_create",
    {
      description: "Create a checklist on a card.",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        name: z.string().min(1),
      },
      outputSchema,
    },
    async ({ profile, cardId, name }) =>
      withClient(profile, (client) => client.checklistCreate({ idCard: cardId, name })),
  );

  server.registerTool(
    "trello_checklist_add_item",
    {
      description: "Add an item to a checklist.",
      inputSchema: {
        profile: profileField,
        checklistId: z.string().min(1),
        name: z.string().min(1),
        checked: z.boolean().optional(),
      },
      outputSchema,
    },
    async ({ profile, checklistId, name, checked }) =>
      withClient(profile, (client) =>
        client.checklistAddItem(checklistId, { name, checked }),
      ),
  );
}
