import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTrelloTools } from "./tools/index.ts";

describe("trelly MCP tool schemas", () => {
  it("offers fresh on network reads without adding it to mutations", async () => {
    const server = new McpServer({ name: "trelly-test", version: "0" });
    registerTrelloTools(server);
    const client = new Client({ name: "trelly-test-client", version: "0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      const { tools } = await client.listTools();
      const byName = new Map(tools.map((tool) => [tool.name, tool]));
      const readTools = [
        "trello_member_me",
        "trello_boards_list",
        "trello_board_get",
        "trello_board_lists",
        "trello_board_cards",
        "trello_list_cards",
        "trello_card_get",
        "trello_card_comments",
        "trello_search",
        "trello_webhooks_list",
        "trello_api",
      ];

      assert.equal(tools.length, 29);
      for (const name of readTools) {
        const schema = byName.get(name)?.inputSchema as
          | { properties?: Record<string, unknown> }
          | undefined;
        assert.ok(schema?.properties?.fresh, `${name} should accept fresh`);
      }

      const mutationSchema = byName.get("trello_card_update")?.inputSchema as
        | { properties?: Record<string, unknown> }
        | undefined;
      assert.equal(mutationSchema?.properties?.fresh, undefined);
    } finally {
      await client.close();
    }
  });
});
