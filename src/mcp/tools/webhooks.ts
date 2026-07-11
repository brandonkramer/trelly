import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  freshField,
  profileField,
  toolEnvelopeSchema,
  withClient,
} from "../handlers.ts";

export function registerWebhookTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_webhooks_list",
    {
      description: "List webhooks registered for the current token.",
      inputSchema: { profile: profileField, fresh: freshField },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, fresh }) =>
      withClient(profile, (client) => client.webhooksForToken(), fresh),
  );

  server.registerTool(
    "trello_webhook_create",
    {
      description: "Create a webhook on a board or card model.",
      inputSchema: {
        profile: profileField,
        callbackUrl: z.string().url(),
        modelId: z.string().min(1),
        description: z.string().optional(),
      },
      outputSchema,
    },
    async ({ profile, callbackUrl, modelId, description }) =>
      withClient(profile, (client) =>
        client.webhookCreate({
          callbackURL: callbackUrl,
          idModel: modelId,
          description,
        }),
      ),
  );

  server.registerTool(
    "trello_webhook_delete",
    {
      description: "Delete a webhook by id.",
      inputSchema: { profile: profileField, webhookId: z.string().min(1) },
      annotations: { destructiveHint: true },
      outputSchema,
    },
    async ({ profile, webhookId }) =>
      withClient(profile, (client) => client.webhookDelete(webhookId)),
  );
}
