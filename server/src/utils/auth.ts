import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const DEFAULT_SESSION_TTL_DAYS = 30;

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function getSessionExpiry(): Date {
  const daysRaw = Number.parseInt(process.env.SESSION_TTL_DAYS || '', 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : DEFAULT_SESSION_TTL_DAYS;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derivedKey = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(keyBuffer, derivedKey);
}
