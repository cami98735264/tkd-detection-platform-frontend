// Authenticated file downloads. Private files (report CSVs, medical
// certificates) are served by authenticated API endpoints, so they must be
// fetched with the session cookies through axios — a plain <a href> to /media
// would either be public (the old, insecure setup) or fail without cookies.
import { config } from "@/config/env";
import { http } from "@/lib/http";

/**
 * Map a file URL from the API onto an axios request config:
 * - absolute http(s) URLs are used as-is;
 * - root-relative paths ("/api/v1/...", "/media/...") resolve against the
 *   API origin (same origin when API_URL is empty, i.e. through the proxy);
 * - anything else is relative to the versioned API base ("reports/1/download/").
 */
export function resolveFileRequest(url: string): { url: string; baseURL?: string } {
  if (/^https?:\/\//i.test(url)) return { url };
  if (url.startsWith("/")) return { url, baseURL: config.apiUrl || "" };
  return { url };
}

/** Extract the filename from a Content-Disposition header (RFC 6266 / 5987). */
export function filenameFromDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to the plain filename parameter
    }
  }
  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(header);
  return plain ? plain[2].trim() : null;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

/** Fetch a protected file as a Blob, with its server-provided filename. */
export async function fetchFile(url: string, fallbackName: string): Promise<DownloadedFile> {
  const { url: target, baseURL } = resolveFileRequest(url);
  const response = await http.getBlob(target, baseURL !== undefined ? { baseURL } : undefined);
  const disposition = response.headers?.["content-disposition"] as string | undefined;
  return { blob: response.data, filename: filenameFromDisposition(disposition) ?? fallbackName };
}

/** Trigger a browser "save as" for a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Download a protected file and save it locally. (Deliberately no "open in a
 * new tab": a blob: document inherits this app's CSP, whose object-src 'none'
 * stops browsers' built-in PDF viewers.)
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await fetchFile(url, fallbackName);
  saveBlob(blob, filename);
}
