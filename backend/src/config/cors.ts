export function configuredCorsOrigins(): string[] {
  return String(process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
): void {
  if (!origin || configuredCorsOrigins().includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin is not allowed: ${origin}`));
}
