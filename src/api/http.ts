export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Query = Record<string, string | number | boolean | undefined>;

export class TrelloError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "TrelloError";
  }
}

export type RequestOptions = {
  timeoutMs?: number;
  maxRetries?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(res: Response, attempt: number): number {
  const header = res.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

export async function trelloFetch(
  url: URL,
  init: RequestInit,
  opts: RequestOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.status !== 429 || attempt === maxRetries) {
      return res;
    }

    await sleep(retryAfterMs(res, attempt));
  }

  throw new TrelloError("Rate limit exceeded", 429, null);
}

export function parseTrelloResponse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function trelloErrorMessage(parsed: unknown, status: number): string {
  if (
    typeof parsed === "object" &&
    parsed &&
    "message" in parsed &&
    typeof (parsed as { message: unknown }).message === "string"
  ) {
    return (parsed as { message: string }).message;
  }
  return `Trello API ${status}`;
}
