import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { CliRequestCache } from "./cache.ts";

const directories: string[] = [];

function cacheDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "trelly-cli-cache-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("CliRequestCache", () => {
  it("reuses successful GET responses across cache instances", async () => {
    const directory = cacheDirectory();
    let calls = 0;
    const fetch = async () => ({ call: ++calls });
    const request = { method: "GET", path: "/cards/1" };

    const first = await new CliRequestCache(directory).execute("work", request, fetch);
    const second = await new CliRequestCache(directory).execute("work", request, fetch);

    assert.deepEqual(second, first);
    assert.equal(calls, 1);
  });

  it("expires entries according to the shared route TTL", async () => {
    const directory = cacheDirectory();
    let now = 0;
    let calls = 0;
    const cache = new CliRequestCache(directory, 200, () => now);
    const request = { method: "GET", path: "/cards/1" };
    const fetch = async () => ++calls;

    assert.equal(await cache.execute("work", request, fetch), 1);
    now = 14_999;
    assert.equal(await cache.execute("work", request, fetch), 1);
    now = 15_000;
    assert.equal(await cache.execute("work", request, fetch), 2);
  });

  it("bypasses and refreshes an entry when fresh is true", async () => {
    const directory = cacheDirectory();
    const cache = new CliRequestCache(directory);
    let calls = 0;
    const request = { method: "GET", path: "/cards/1" };
    const fetch = async () => ++calls;

    assert.equal(await cache.execute("work", request, fetch), 1);
    assert.equal(await cache.execute("work", request, fetch, true), 2);
    assert.equal(await cache.execute("work", request, fetch), 2);
  });

  it("invalidates related persisted reads after a successful mutation", async () => {
    const directory = cacheDirectory();
    const cache = new CliRequestCache(directory);
    let reads = 0;
    const read = () =>
      cache.execute("work", { method: "GET", path: "/cards/1" }, async () => ({
        read: ++reads,
      }));

    assert.deepEqual(await read(), { read: 1 });
    await cache.execute("work", { method: "PUT", path: "/cards/1" }, async () => ({}));
    assert.deepEqual(await read(), { read: 2 });
  });

  it("does not cache errors and can be disabled", async () => {
    const directory = cacheDirectory();
    const request = { method: "GET", path: "/boards" };
    const cache = new CliRequestCache(directory);

    await assert.rejects(() =>
      cache.execute("work", request, async () => {
        throw new Error("failed");
      }),
    );

    let calls = 0;
    const disabled = new CliRequestCache(directory, 200, Date.now, () => false);
    const fetch = async () => ++calls;
    assert.equal(await disabled.execute("work", request, fetch), 1);
    assert.equal(await disabled.execute("work", request, fetch), 2);
  });
});
