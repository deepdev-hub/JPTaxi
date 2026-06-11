import { apiFormData } from './client.js';

/** POST /api/uploads/avatar — field: file */
export function uploadAvatar(file) {
  const body = new FormData();
  body.append('file', file);
  return apiFormData('/uploads/avatar', body);
}

/** POST /api/uploads/drivers/:documentType — field: file */
export function uploadDriverDocument(documentType, file) {
  const body = new FormData();
  body.append('file', file);
  return apiFormData(`/uploads/drivers/${documentType}`, body);
}
