import argon2 from 'argon2';
import crypto from 'node:crypto';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,         // 3 iterations
  parallelism: 4,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
}

/**
 * Check password against Have I Been Pwned using k-anonymity.
 * The full password never leaves the server.
 */
export async function checkPwnedPassword(
  password: string,
): Promise<boolean> {
  try {
    const sha1 = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { 'Add-Padding': 'true' },
      },
    );

    if (!response.ok) return false; // fail open - don't block registration

    const text = await response.text();
    return text.split('\n').some((line) => {
      const [hash] = line.split(':');
      return hash.trim() === suffix;
    });
  } catch {
    return false; // fail open on network errors
  }
}
