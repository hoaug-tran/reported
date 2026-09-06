import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export class TotpService {
  generateSecret(length = 20): string {
    const randomBytes = crypto.randomBytes(length);
    return base32Encode(randomBytes);
  }

  generateOtpauthUrl(email: string, secret: string, issuer = 'Reported'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedLabel = encodeURIComponent(`${issuer}:${email}`);
    return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  generateTOTP(secret: string, timeStepWindow = 0): string {
    const key = base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;

    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;

    return code.toString().padStart(6, '0');
  }

  verifyTOTP(token: string, secret: string): boolean {
    const cleanToken = token.trim();
    if (cleanToken.length !== 6) {
      return false;
    }

    for (let window = -1; window <= 1; window++) {
      const generated = this.generateTOTP(secret, window);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(generated))) {
        return true;
      }
    }

    return false;
  }

  generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const hex = crypto.randomBytes(4).toString('hex');
      codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
    }
    return codes;
  }

  verifyBackupCode(code: string, backupCodesJson: string | null): { isValid: boolean; remainingCodesJson: string | null } {
    if (!backupCodesJson) {
      return { isValid: false, remainingCodesJson: null };
    }

    try {
      const codes = JSON.parse(backupCodesJson) as string[];
      const cleanCode = code.trim().toLowerCase();
      const index = codes.findIndex((c) => c.toLowerCase() === cleanCode);

      if (index !== -1) {
        codes.splice(index, 1);
        return { isValid: true, remainingCodesJson: JSON.stringify(codes) };
      }
    } catch {
      return { isValid: false, remainingCodesJson: null };
    }

    return { isValid: false, remainingCodesJson: backupCodesJson };
  }
}

export const totpService = new TotpService();
