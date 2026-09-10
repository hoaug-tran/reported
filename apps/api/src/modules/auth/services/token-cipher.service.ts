import crypto from "crypto";
import { config } from "../../../config/index.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const salt = "reported_token_encryption_salt_2026";
  return crypto.scryptSync(
    config.sessionSecret || "reported_default_encryption_key_2026",
    salt,
    32,
  );
}

export function encryptToken(
  plainText: string | null | undefined,
): string | null {
  if (!plainText) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptToken(
  cipherText: string | null | undefined,
): string | null {
  if (!cipherText) return null;
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, tagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt token:", error);
    return null;
  }
}
