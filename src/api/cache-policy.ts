import type { Query } from "./client.ts";

export type CacheRequest = {
  method: string;
  path: string;
  query?: Query;
};

export type NormalizedCacheRequest = {
  key: string;
  path: string;
};

const DEFAULT_TTL_MS = 15_000;
const STATIC_TTL_MS = 60_000;
const COMMENTS_AND_ATTACHMENTS_TTL_MS = 10_000;
const SEARCH_TTL_MS = 20_000;

function normalizeFieldList(value: string): string {
  return value
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function normalizeCacheRequest(
  profile: string,
  path: string,
  query: Query = {},
): NormalizedCacheRequest {
  const url = new URL(
    path.startsWith("/") ? path : `/${path}`,
    "https://cache.invalid",
  );
  const params = new Map<string, string>();

  for (const [key, value] of url.searchParams) {
    params.set(key, value);
  }
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }

  const normalizedParams = [...params.entries()]
    .map(([key, value]) => [
      key,
      key.toLowerCase().endsWith("fields") ? normalizeFieldList(value) : value,
    ])
    .sort(([left], [right]) => left.localeCompare(right));
  const normalizedPath =
    url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;

  return {
    key: JSON.stringify([profile, normalizedPath, normalizedParams]),
    path: normalizedPath,
  };
}

export function cacheTtlMs(path: string): number {
  const normalized = path.toLowerCase();

  if (normalized === "/search") return SEARCH_TTL_MS;
  if (/^\/cards\/[^/]+\/(actions|attachments)(?:\/|$)/.test(normalized)) {
    return COMMENTS_AND_ATTACHMENTS_TTL_MS;
  }
  if (/^\/(boards|lists)\/[^/]+\/cards(?:\/|$)/.test(normalized)) {
    return DEFAULT_TTL_MS;
  }
  if (/^\/cards(?:\/|$)/.test(normalized)) return DEFAULT_TTL_MS;
  if (
    /^\/(boards|lists|labels)(?:\/|$)/.test(normalized) ||
    /^\/members\/[^/]+\/boards(?:\/|$)/.test(normalized) ||
    /^\/organizations\/[^/]+\/boards(?:\/|$)/.test(normalized)
  ) {
    return STATIC_TTL_MS;
  }

  return DEFAULT_TTL_MS;
}

function isCardCollection(path: string): boolean {
  return (
    /^\/cards(?:\/|$)/.test(path) ||
    /^\/lists\/[^/]+\/cards(?:\/|$)/.test(path) ||
    /^\/boards\/[^/]+\/cards(?:\/|$)/.test(path) ||
    path === "/search"
  );
}

function isPathOrChild(path: string, parent: string): boolean {
  return path === parent || path.startsWith(`${parent}/`);
}

export function mutationAffectsCache(
  mutationPath: string,
  cachedPath: string,
): boolean {
  const path = mutationPath.toLowerCase();
  const cached = cachedPath.toLowerCase();

  const cardMatch = path.match(/^\/cards(?:\/([^/]+))?(?:\/|$)/);
  if (cardMatch) {
    const cardId = cardMatch[1];
    return (
      (cardId
        ? isPathOrChild(cached, `/cards/${cardId}`)
        : isPathOrChild(cached, "/cards")) || isCardCollection(cached)
    );
  }

  const boardMatch = path.match(/^\/boards(?:\/([^/]+))?(?:\/|$)/);
  if (boardMatch) {
    const boardId = boardMatch[1];
    return (
      (boardId
        ? isPathOrChild(cached, `/boards/${boardId}`)
        : isPathOrChild(cached, "/boards")) ||
      /^\/members\/[^/]+\/boards(?:\/|$)/.test(cached) ||
      /^\/organizations\/[^/]+\/boards(?:\/|$)/.test(cached) ||
      cached === "/search"
    );
  }

  const listMatch = path.match(/^\/lists(?:\/([^/]+))?(?:\/|$)/);
  if (listMatch) {
    const listId = listMatch[1];
    return (
      (listId
        ? isPathOrChild(cached, `/lists/${listId}`)
        : isPathOrChild(cached, "/lists")) ||
      /^\/boards\/[^/]+\/(lists|cards)(?:\/|$)/.test(cached) ||
      cached === "/search"
    );
  }

  if (/^\/labels(?:\/|$)/.test(path)) {
    return (
      /^\/labels(?:\/|$)/.test(cached) ||
      /^\/boards\/[^/]+\/(labels|cards)(?:\/|$)/.test(cached) ||
      /^\/lists\/[^/]+\/cards(?:\/|$)/.test(cached) ||
      /^\/cards(?:\/|$)/.test(cached) ||
      cached === "/search"
    );
  }

  if (/^\/checklists(?:\/|$)/.test(path)) {
    return cached.startsWith("/checklists") || isCardCollection(cached);
  }

  if (/^\/customfields(?:\/|$)/.test(path)) {
    return (
      cached.startsWith("/customfields") ||
      /^\/boards\/[^/]+\/customfields(?:\/|$)/.test(cached) ||
      isCardCollection(cached)
    );
  }

  if (/^\/webhooks(?:\/|$)/.test(path)) {
    return cached.startsWith("/webhooks") || /^\/tokens\/[^/]+\/webhooks/.test(cached);
  }

  return true;
}
