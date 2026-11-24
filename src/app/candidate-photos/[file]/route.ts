/**
 * Candidate photos, same-origin (lib/bff/photos.ts): read from `API_BASE_URL`, the address the BFF
 * already uses, because the production server cannot reach the public photo host itself (TLS
 * hairpin). lib/api/photoUrl.ts maps `photo_url` to this route. Mock builds keep their own photo
 * URLs (`/api/__mock/uploads/…`), so without `API_BASE_URL` this is a 404.
 */
import { getServerEnv } from '@/config/env';
import { handlePhotoRequest } from '@/lib/bff/photos';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  const base = getServerEnv().API_BASE_URL;
  if (!base) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return handlePhotoRequest(file, {
    upstream: (upstreamRequest) => fetch(upstreamRequest, { cache: 'no-store' }),
    upstreamOrigin: base.replace(/\/+$/, ''),
    signal: request.signal,
  });
}
