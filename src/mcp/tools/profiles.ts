import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { profileField, toolEnvelopeSchema, withClient } from "../handlers.ts";

export function registerProfileTools(server: McpServer): void {
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
        const { loadConfig } = await import("../../auth/profiles.ts");
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
}
