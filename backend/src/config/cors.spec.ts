import { configuredCorsOrigins, corsOrigin } from './cors';

describe('CORS configuration', () => {
  const original = process.env.FRONTEND_URL;
  const originalOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const originalPatterns = process.env.CORS_ALLOWED_ORIGIN_PATTERNS;

  afterEach(() => {
    if (original == null) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = original;
    if (originalOrigins == null) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = originalOrigins;
    if (originalPatterns == null) delete process.env.CORS_ALLOWED_ORIGIN_PATTERNS;
    else process.env.CORS_ALLOWED_ORIGIN_PATTERNS = originalPatterns;
  });

  it('allows only configured browser origins', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173,https://taxi.example';
    expect(configuredCorsOrigins()).toEqual(
      expect.arrayContaining([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://taxi.example',
      ]),
    );
    expect(configuredCorsOrigins()).toHaveLength(3);

    const allowed = jest.fn();
    corsOrigin('https://taxi.example', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);

    const denied = jest.fn();
    corsOrigin('https://untrusted.example', denied);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('allows both localhost loopback hostnames on the configured local port', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173';

    expect(configuredCorsOrigins()).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);

    const allowed = jest.fn();
    corsOrigin('http://127.0.0.1:5173', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);
  });

  it('allows configured deployment origin patterns', () => {
    process.env.CORS_ALLOWED_ORIGIN_PATTERNS = 'https://*.vercel.app';
    const allowed = jest.fn();

    corsOrigin('https://jp-taxi-preview.vercel.app', allowed);

    expect(allowed).toHaveBeenCalledWith(null, true);
  });
});
