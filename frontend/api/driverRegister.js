import { apiFormData } from './client.js';

/** POST /api/drivers/register — hồ sơ + 5 ảnh */
export function registerDriverApplication(formData) {
  return apiFormData('/drivers/register', formData);
}
