import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client.js';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves the standardized backend error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      }),
      {
        status: 401,
        headers: { 'content-type': 'application/json' },
      },
    )));

    await expect(apiRequest('/protected')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });
});
