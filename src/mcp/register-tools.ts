import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JsonValue } from "../api/client.ts";
import { profileField, runApi, toolEnvelopeSchema, withClient } from "./handlers.ts";

export function registerTrelloTools(server: McpServer): void {
  const outputSchema = toolEnvelopeSchema;

  server.registerTool(
    "trello_profiles_list",
    {
      description: "List saved Trello auth profiles and the active default.",
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async () =>
      withClient(undefined, async (_client, profileName) => {
        const { loadConfig } = await import("../auth/profiles.ts");
        const config = loadConfig();
        return {
          activeProfile: profileName,
          defaultProfile: config.defaultProfile,
          profiles: Object.entries(config.profiles).map(([name, p]) => ({
            name,
            label: p.label,
            isDefault: name === config.defaultProfile,
          })),
        };
      }),
  );

  server.registerTool(
    "trello_member_me",
    {
      description: "Get the authenticated Trello member.",
      inputSchema: { profile: profileField },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile }) => withClient(profile, (client) => client.memberMe()),
  );

  server.registerTool(
    "trello_boards_list",
    {
      description: "List boards visible to the authenticated member.",
      inputSchema: {
        profile: profileField,
        filter: z
          .enum([
            "all",
            "closed",
            "memberships",
            "open",
            "organization",
            "pinned",
            "public",
            "starred",
            "unpinned",
          ])
          .optional()
          .default("open"),
        fields: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, filter, fields }) =>
      withClient(profile, (client) => client.memberBoards("me", { filter, fields })),
  );

  server.registerTool(
    "trello_board_get",
    {
      description: "Get a board by id.",
      inputSchema: {
        profile: profileField,
        boardId: z.string().min(1),
        fields: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, boardId, fields }) =>
      withClient(profile, (client) => client.boardGet(boardId, { fields })),
  );

  server.registerTool(
    "trello_board_create",
    {
      description: "Create a board.",
      inputSchema: {
        profile: profileField,
        name: z.string().min(1),
        description: z.string().optional(),
        organizationId: z.string().optional(),
        defaultLists: z.boolean().optional(),
      },
      outputSchema,
    },
    async ({ profile, name, description, organizationId, defaultLists }) =>
      withClient(profile, (client) =>
        client.boardCreate({
          name,
          desc: description,
          idOrganization: organizationId,
          defaultLists,
        }),
      ),
  );

  server.registerTool(
    "trello_board_archive",
    {
      description: "Close (archive) a board. Reversible in the Trello UI.",
      inputSchema: { profile: profileField, boardId: z.string().min(1) },
      annotations: { destructiveHint: true },
      outputSchema,
    },
    async ({ profile, boardId }) =>
      withClient(profile, (client) => client.boardArchive(boardId)),
  );

  server.registerTool(
    "trello_board_lists",
    {
      description: "List lists on a board.",
      inputSchema: {
        profile: profileField,
        boardId: z.string().min(1),
        filter: z.string().optional().default("open"),
      },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, boardId, filter }) =>
      withClient(profile, (client) => client.boardLists(boardId, { filter })),
  );

  server.registerTool(
    "trello_board_cards",
    {
      description: "List all cards on a board.",
      inputSchema: { profile: profileField, boardId: z.string().min(1) },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, boardId }) =>
      withClient(profile, (client) => client.boardCards(boardId)),
  );

  server.registerTool(
    "trello_list_create",
    {
      description: "Create a list on a board.",
      inputSchema: {
        profile: profileField,
        boardId: z.string().min(1),
        name: z.string().min(1),
        position: z.string().optional(),
      },
      outputSchema,
    },
    async ({ profile, boardId, name, position }) =>
      withClient(profile, (client) =>
        client.listCreate({ idBoard: boardId, name, pos: position }),
      ),
  );

  server.registerTool(
    "trello_list_cards",
    {
      description: "List cards in a list.",
      inputSchema: { profile: profileField, listId: z.string().min(1) },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, listId }) =>
      withClient(profile, (client) => client.listCards(listId)),
  );

  server.registerTool(
    "trello_card_get",
    {
      description: "Get a card by id or short link.",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        fields: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile, cardId, fields }) =>
      withClient(profile, (client) => client.cardGet(cardId, { fields })),
  );

  server.registerTool(
    "trello_card_create",
    {
      description: "Create a card on a list.",
      inputSchema: {
        profile: profileField,
        listId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        due: z.string().optional(),
        position: z.string().optional(),
      },
      outputSchema,
    },
    async ({ profile, listId, name, description, due, position }) =>
      withClient(profile, (client) =>
        client.cardCreate({
          idList: listId,
          name,
          desc: description,
          due,
          pos: position,
        }),
      ),
  );

  server.registerTool(
    "trello_card_update",
    {
      description: "Update card fields (name, desc, due, closed, idList, etc.).",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        fields: z.record(z.string(), z.string()),
      },
      outputSchema,
    },
    async ({ profile, cardId, fields }) =>
      withClient(profile, (client) => client.cardUpdate(cardId, fields)),
  );

  server.registerTool(
    "trello_card_move",
    {
      description: "Move a card to another list.",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        listId: z.string().min(1),
        position: z.string().optional(),
      },
      outputSchema,
    },
    async ({ profile, cardId, listId, position }) =>
      withClient(profile, (client) =>
        client.cardUpdate(cardId, { idList: listId, pos: position }),
      ),
  );

  server.registerTool(
    "trello_card_comment",
    {
      description: "Add a comment to a card.",
      inputSchema: {
        profile: profileField,
        cardId: z.string().min(1),
        text: z.string().min(1),
      },
      outputSchema,
    },
    async ({ profile, cardId, text }) =>
      withClient(profile, (client) => client.cardComment(cardId, text)),
  );

  server.registerTool(
    "trello_card_archive",
    {
      description: "Close (archive) a card. Reversible in the Trello UI.",
      inputSchema: { profile: profileField, cardId: z.string().min(1) },
      annotations: { destructiveHint: true },
      outputSchema,
    },
    async ({ profile, cardId }) =>
      withClient(profile, (client) => client.cardArchive(cardId)),
  );

  server.registerTool(
    "trello_card_delete",
    {
      description:
        "Permanently delete a card. Irreversible — prefer trello_card_archive to close.",
      inputSchema: { profile: profileField, cardId: z.string().min(1) },
      annotations: { destructiveHint: true },
      outputSchema,
    },
    async ({ profile, cardId }) =>
      withClient(profile, (client) => client.cardDelete(cardId)),
  );

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

  server.registerTool(
    "trello_webhooks_list",
    {
      description: "List webhooks registered for the current token.",
      inputSchema: { profile: profileField },
      annotations: { readOnlyHint: true },
      outputSchema,
    },
    async ({ profile }) => withClient(profile, (client) => client.webhooksForToken()),
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
