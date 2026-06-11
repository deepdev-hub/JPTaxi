import { configuredCorsOrigins, corsOrigin } from './cors';

describe('CORS configuration', () => {
  const original = process.env.FRONTEND_URL;

  afterEach(() => {
    if (original == null) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = original;
  });

  it('allows only configured browser origins', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173,https://taxi.example';
    expect(configuredCorsOrigins()).toEqual([
      'http://localhost:5173',
      'https://taxi.example',
    ]);

    const allowed = jest.fn();
    corsOrigin('https://taxi.example', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);

    const denied = jest.fn();
    corsOrigin('https://untrusted.example', denied);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
