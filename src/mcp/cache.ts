import {
  type CacheRequest,
  cacheTtlMs,
  mutationAffectsCache,
  normalizeCacheRequest,
} from "../api/cache-policy.ts";
import type { JsonValue, Query } from "../api/client.ts";
import { TrelloClient } from "../api/client.ts";

type CacheEntry = {
  expiresAt: number;
  path: string;
  profile: string;
  value: unknown;
};

type InFlightEntry = {
  path: string;
  profile: string;
  promise: Promise<unknown>;
};

const DEFAULT_MAX_ENTRIES = 200;

export { cacheTtlMs } from "../api/cache-policy.ts";

export class McpRequestCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly generations = new Map<string, number>();
  private readonly inFlight = new Map<string, InFlightEntry>();

  constructor(
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
    private readonly now: () => number = Date.now,
    private readonly enabled: () => boolean = () => process.env.TRELLO_CACHE !== "0",
  ) {}

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.generations.clear();
    this.inFlight.clear();
  }

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

    const active = this.inFlight.get(normalized.key);
    if (active) return active.promise as Promise<T>;

    const generation = this.generations.get(profile) ?? 0;
    const promise = next().then((value) => {
      if (this.enabled() && (this.generations.get(profile) ?? 0) === generation) {
        this.set(normalized.key, {
          expiresAt: this.now() + cacheTtlMs(normalized.path),
          path: normalized.path,
          profile,
          value,
        });
      }
      return value;
    });
    const pending = { path: normalized.path, profile, promise };
    this.inFlight.set(normalized.key, pending);

    try {
      return await promise;
    } finally {
      if (this.inFlight.get(normalized.key) === pending) {
        this.inFlight.delete(normalized.key);
      }
    }
  }

  invalidateMutation(profile: string, path: string): void {
    this.generations.set(profile, (this.generations.get(profile) ?? 0) + 1);

    for (const [key, entry] of this.entries) {
      if (entry.profile === profile && mutationAffectsCache(path, entry.path)) {
        this.entries.delete(key);
      }
    }
    for (const [key, entry] of this.inFlight) {
      if (entry.profile === profile && mutationAffectsCache(path, entry.path)) {
        this.inFlight.delete(key);
      }
    }
  }

  private get(key: string): { hit: boolean; value?: unknown } {
    const entry = this.entries.get(key);
    if (!entry) return { hit: false };
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return { hit: false };
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return { hit: true, value: entry.value };
  }

  private set(key: string, entry: CacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

export const mcpRequestCache = new McpRequestCache();

export class CachedMcpTrelloClient extends TrelloClient {
  constructor(
    apiKey: string,
    token: string,
    private readonly profileName: string,
    private readonly fresh = false,
  ) {
    super(apiKey, token);
  }

  override request<T = JsonValue>(
    method: string,
    path: string,
    query: Query = {},
    body?: JsonValue | FormData,
  ): Promise<T> {
    return mcpRequestCache.execute(
      this.profileName,
      { method, path, query },
      () => super.request<T>(method, path, query, body),
      this.fresh,
    );
  }
}
