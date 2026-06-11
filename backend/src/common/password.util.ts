import * as bcrypt from 'bcryptjs';

const BCRYPT_HASH_PREFIX = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value: string | null | undefined): value is string {
  return typeof value === 'string' && BCRYPT_HASH_PREFIX.test(value);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!plain || !isBcryptHash(hash)) {
    return false;
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}
