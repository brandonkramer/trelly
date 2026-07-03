import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
};

export function attachmentMime(filePath: string): string {
  return MIME_BY_EXT[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

export function attachmentForm(filePath: string, name?: string): FormData {
  const form = new FormData();
  form.append(
    "file",
    new Blob([readFileSync(filePath)], { type: attachmentMime(filePath) }),
    name ?? basename(filePath),
  );
  return form;
}
