import { PHOTOS } from '@/config/constants';

const FILE_NAME = new RegExp(`^[A-Za-z0-9_-]{1,${PHOTOS.fileNameMax}}\\.(?:jpe?g|png|webp)$`, 'i');

/** A photo file name the same-origin photo route serves (no path, no dots but the extension). */
export function isPhotoFileName(name: string): boolean {
  return FILE_NAME.test(name);
}

function parseAbsolute(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * The backend's absolute `photo_url` (`https://…/uploads/candidates/<file>`, staging under
 * `/staging/uploads/…`) as the same-origin `/candidate-photos/<file>`, which the Next server reads
 * from `API_BASE_URL` (see PHOTOS). Anything else (mock paths, `blob:` previews, an unexpected
 * shape) is returned as it is.
 */
export function toPhotoSrc(url: string | null): string | null {
  if (!url) return url;
  const parsed = parseAbsolute(url);
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.search) {
    return url;
  }
  const marker = `${PHOTOS.upstreamPath}/`;
  const at = parsed.pathname.lastIndexOf(marker);
  if (at < 0) return url;
  const file = parsed.pathname.slice(at + marker.length);
  return isPhotoFileName(file) ? `${PHOTOS.routePrefix}/${file}` : url;
}
