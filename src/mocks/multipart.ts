/**
 * Minimal multipart/form-data reader for the mock backend (one file field). Used instead of
 * Request.formData(), which fails under Vitest/jsdom (undici checks for its own File class).
 */
export interface UploadedFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

const CRLF_CRLF = [13, 10, 13, 10];

function indexOf(haystack: Uint8Array, needle: readonly number[], from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** The file part named `field`, or null when the body is not multipart or has no such file. */
export async function readMultipartFile(
  request: Request,
  field: string,
): Promise<UploadedFile | null> {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
    request.headers.get('content-type') ?? '',
  );
  const marker = boundary?.[1] ?? boundary?.[2];
  if (!marker) return null;
  const body = new Uint8Array(await request.arrayBuffer());
  const delimiter = [...new TextEncoder().encode(`--${marker}`)];
  const decoder = new TextDecoder();

  let start = indexOf(body, delimiter);
  while (start >= 0) {
    const headerStart = start + delimiter.length + 2;
    const headerEnd = indexOf(body, CRLF_CRLF, headerStart);
    if (headerEnd < 0) return null;
    const next = indexOf(body, delimiter, headerEnd);
    if (next < 0) return null;
    const headers = decoder.decode(body.slice(headerStart, headerEnd));
    const name = /name="([^"]*)"/i.exec(headers)?.[1];
    const fileName = /filename="([^"]*)"/i.exec(headers)?.[1];
    if (name === field && fileName !== undefined) {
      const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() ?? '';
      // Part data ends with CRLF before the next delimiter.
      return { name: fileName, type, bytes: body.slice(headerEnd + 4, next - 2) };
    }
    start = next;
  }
  return null;
}
