import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTrelloResponse, trelloErrorMessage } from "./api/http.ts";
import { authLoginUrl } from "./auth/profiles.ts";
import { parseKvPairs } from "./cli/context.ts";

describe("parseKvPairs", () => {
  it("parses key=value pairs", () => {
    assert.deepEqual(parseKvPairs(["name=foo", "closed=true"]), {
      name: "foo",
      closed: "true",
    });
  });

  it("rejects invalid pairs", () => {
    assert.throws(() => parseKvPairs(["invalid"]), /Invalid key=value/);
  });
});

describe("authLoginUrl", () => {
  it("defaults to read,write and 30days", () => {
    const url = new URL(authLoginUrl("test-key"));
    assert.equal(url.searchParams.get("key"), "test-key");
    assert.equal(url.searchParams.get("scope"), "read,write");
    assert.equal(url.searchParams.get("expiration"), "30days");
  });

  it("supports callback return_url", () => {
    const url = new URL(
      authLoginUrl("test-key", {
        returnUrl: "http://127.0.0.1:14189/callback",
      }),
    );
    assert.equal(url.searchParams.get("callback_method"), "fragment");
    assert.equal(url.searchParams.get("return_url"), "http://127.0.0.1:14189/callback");
  });
});

describe("trello HTTP helpers", () => {
  it("parses JSON responses", () => {
    assert.deepEqual(parseTrelloResponse('{"id":"1"}'), { id: "1" });
  });

  it("extracts Trello error messages", () => {
    assert.equal(
      trelloErrorMessage({ message: "invalid token" }, 401),
      "invalid token",
    );
    assert.equal(trelloErrorMessage(null, 500), "Trello API 500");
  });
});
