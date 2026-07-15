import { createHmac, randomBytes } from 'crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30s) implemented from scratch — no dependency,
// interoperable with Google Authenticator / Authy / any RFC-6238 app.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD = 30;
const DIGITS = 6;

// A base32 (RFC 4648) secret is what authenticator apps expect.
export function generateBase32Secret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5)
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret
    .replace(/=+$/, '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const c of clean)
    bits += BASE32_ALPHABET.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

// Verify a 6-digit token (±`window` periods for clock drift) and return the
// time-step it matched, or null if it doesn't verify OR was already used
// (step <= lastUsedStep) — the caller persists the returned step so a code can
// never be replayed within (or across) its validity window.
export function matchTotpStep(
  base32Secret: string,
  token: string,
  lastUsedStep = -1,
  window = 1,
): number | null {
  const t = (token ?? '').trim();
  if (!/^\d{6}$/.test(t)) return null;
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  for (let w = -window; w <= window; w++) {
    const step = counter + w;
    if (step <= lastUsedStep) continue; // already consumed → replay, reject
    if (hotp(secret, step) === t) return step;
  }
  return null;
}

// otpauth:// URI for QR / manual entry into an authenticator app.
export function otpauthUri(
  base32Secret: string,
  account: string,
  issuer = 'ft_hub',
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
