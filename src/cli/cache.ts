import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  type CacheRequest,
  cacheTtlMs,
  mutationAffectsCache,
  normalizeCacheRequest,
} from "../api/cache-policy.ts";
import type { JsonValue, Query, RequestOptions } from "../api/client.ts";
import { TrelloClient } from "../api/client.ts";

type DiskCacheEntry = {
  expiresAt: number;
  key: string;
  path: string;
  profile: string;
  value: unknown;
};

const DEFAULT_MAX_ENTRIES = 200;

export function cliCacheDirectory(): string {
  const root = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(root, "trelly", "responses");
}

function isDiskCacheEntry(value: unknown): value is DiskCacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<DiskCacheEntry>;
  return (
    typeof entry.expiresAt === "number" &&
    typeof entry.key === "string" &&
    typeof entry.path === "string" &&
    typeof entry.profile === "string" &&
    "value" in entry
  );
}

export class CliRequestCache {
  constructor(
    private readonly directory = cliCacheDirectory(),
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
    private readonly now: () => number = Date.now,
    private readonly enabled: () => boolean = () => process.env.TRELLO_CACHE !== "0",
  ) {}

  async execute<T>(
    profile: string,
    request: CacheRequest,
    next: () => Promise<T>,
    fresh = false,
  ): Promise<T> {
    const method = request.method.toUpperCase();
    const normalized = normalizeCacheRequest(profile, request.path, request.query);

    if (method !== "GET") {
      const result = await next();
      this.invalidateMutation(profile, normalized.path);
      return result;
    }

    if (!this.enabled()) return next();
    if (!fresh) {
      const cached = this.get(normalized.key);
      if (cached.hit) return cached.value as T;
    }

    const value = await next();
    this.set(normalized.key, {
      expiresAt: this.now() + cacheTtlMs(normalized.path),
      key: normalized.key,
      path: normalized.path,
      profile,
      value,
    });
    return value;
  }

  invalidateMutation(profile: string, path: string): void {
    for (const file of this.files()) {
      const entry = this.read(file);
      if (entry?.profile === profile && mutationAffectsCache(path, entry.path)) {
        this.remove(file);
      }
    }
  }

  private cacheFile(key: string): string {
    const digest = createHash("sha256").update(key).digest("hex");
    return join(this.directory, `${digest}.json`);
  }

  private files(): string[] {
    if (!existsSync(this.directory)) return [];
    try {
      return readdirSync(this.directory)
        .filter((name) => name.endsWith(".json"))
        .map((name) => join(this.directory, name));
    } catch {
      return [];
    }
  }

  private get(key: string): { hit: boolean; value?: unknown } {
    const file = this.cacheFile(key);
    const entry = this.read(file);
    if (!entry || entry.key !== key) return { hit: false };
    if (entry.expiresAt <= this.now()) {
      this.remove(file);
      return { hit: false };
    }

    try {
      const now = new Date(this.now());
      utimesSync(file, now, now);
    } catch {
      // A cache hit should not fail the command if metadata cannot be updated.
    }
    return { hit: true, value: entry.value };
  }

  private read(file: string): DiskCacheEntry | undefined {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
      if (isDiskCacheEntry(parsed)) return parsed;
    } catch {
      // Corrupt or concurrently removed cache entries are misses.
    }
    this.remove(file);
    return undefined;
  }

  private set(key: string, entry: DiskCacheEntry): void {
    try {
      mkdirSync(this.directory, { recursive: true, mode: 0o700 });
      chmodSync(this.directory, 0o700);
      const file = this.cacheFile(key);
      const temporary = `${file}.${process.pid}.tmp`;
      writeFileSync(temporary, JSON.stringify(entry), { mode: 0o600 });
      renameSync(temporary, file);
      chmodSync(file, 0o600);
      this.prune();
    } catch {
      // Caching is an optimization and must never make a CLI request fail.
    }
  }

  private prune(): void {
    const files = this.files()
      .map((file) => {
        try {
          return { file, modifiedAt: statSync(file).mtimeMs };
        } catch {
          return undefined;
        }
      })
      .filter((entry): entry is { file: string; modifiedAt: number } => Boolean(entry))
      .sort((left, right) => right.modifiedAt - left.modifiedAt);

    for (const { file } of files.slice(this.maxEntries)) this.remove(file);
  }

  private remove(file: string): void {
    try {
      unlinkSync(file);
    } catch {
      // Already absent or not writable; both are safe to ignore.
    }
  }
}

export const cliRequestCache = new CliRequestCache();

export class CachedCliTrelloClient extends TrelloClient {
  constructor(
    apiKey: string,
    token: string,
    private readonly profile: string,
    private readonly fresh = false,
    requestOptions: RequestOptions = {},
    private readonly cache = cliRequestCache,
  ) {
    super(apiKey, token, requestOptions);
  }

  override request<T = JsonValue>(
    method: string,
    path: string,
    query: Query = {},
    body?: JsonValue | FormData,
  ): Promise<T> {
    return this.cache.execute(
      this.profile,
      { method, path, query },
      () => super.request<T>(method, path, query, body),
      this.fresh,
    );
  }
}
