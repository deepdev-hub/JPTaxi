export function configuredCorsOrigins(): string[] {
  const configured = String(
    process.env.CORS_ALLOWED_ORIGINS ??
    process.env.FRONTEND_URL ??
    'http://localhost:5173',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = new Set(configured);

  for (const origin of configured) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1';
        origins.add(url.origin);
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost';
        origins.add(url.origin);
      }
    } catch {
      // Environment validation reports malformed URLs.
    }
  }

  return [...origins];
}

function matchesConfiguredPattern(origin: string): boolean {
  const patterns = String(process.env.CORS_ALLOWED_ORIGIN_PATTERNS ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);

  return patterns.some((pattern) => {
    const expression = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^.]+');
    return new RegExp(`^${expression}$`, 'i').test(origin);
  });
}

export function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
): void {
  if (
    !origin ||
    configuredCorsOrigins().includes(origin) ||
    matchesConfiguredPattern(origin)
  ) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin is not allowed: ${origin}`));
}
