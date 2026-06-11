import { API_BASE } from '../api/client.js';

const UPLOAD_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/** Chuyển path `/uploads/...` từ API thành URL đầy đủ */
export function resolveUploadUrl(url, cacheKey) {
  if (!url) return null;
  let resolved;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    resolved = url;
  } else {
    resolved = `${UPLOAD_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
  }
  if (cacheKey == null || cacheKey === '') {
    return resolved;
  }
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}v=${encodeURIComponent(String(cacheKey))}`;
}
