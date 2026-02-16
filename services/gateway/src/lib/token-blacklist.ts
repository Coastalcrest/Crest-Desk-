import { redis } from './redis';
import { logger } from './logger';

// ------------------------------------------------------------------ //
//  Token Blacklist                                                     //
//                                                                     //
//  Uses a Redis SET with per-key TTL so blacklisted JWTs are          //
//  automatically purged once they would have expired anyway.           //
//                                                                     //
//  Key format:  token_blacklist:<jti>                                  //
//  Value:       "1" (presence is all that matters)                     //
// ------------------------------------------------------------------ //

const KEY_PREFIX = 'token_blacklist:';

/**
 * Add a JWT's `jti` to the blacklist.
 *
 * @param jti        - The JWT ID claim from the token.
 * @param expiresIn  - Seconds until the token would naturally expire.
 *                     The Redis key TTL mirrors this so we don't store
 *                     entries longer than necessary.
 */
export async function blacklistToken(
  jti: string,
  expiresIn: number,
): Promise<void> {
  try {
    const ttl = Math.max(expiresIn, 1); // at least 1 second
    await redis.set(`${KEY_PREFIX}${jti}`, '1', 'EX', ttl);
    logger.debug({ jti, ttl }, 'Token blacklisted');
  } catch (err) {
    // Log but don't throw — failing to blacklist shouldn't crash the
    // request. The token will still expire naturally via the JWT exp claim.
    logger.error({ err, jti }, 'Failed to blacklist token');
  }
}

/**
 * Check whether a token's `jti` appears on the blacklist.
 *
 * @returns `true` if the token has been revoked; `false` otherwise.
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  try {
    const result = await redis.get(`${KEY_PREFIX}${jti}`);
    return result !== null;
  } catch (err) {
    // If Redis is down, fail-open (allow the token).
    // In production you might want fail-closed instead — flip this
    // based on your risk tolerance and availability requirements.
    logger.error({ err, jti }, 'Failed to check token blacklist — failing open');
    return false;
  }
}

/**
 * Blacklist all active tokens for a user by storing a "revoke-before"
 * timestamp. Any token issued before this timestamp is considered invalid.
 *
 * @param userId    - The user whose tokens should be invalidated.
 * @param maxTtl    - Maximum remaining TTL of any outstanding token (seconds).
 *                    Defaults to 900 (15 minutes, matching ACCESS_TOKEN_EXPIRY).
 */
export async function blacklistAllUserTokens(
  userId: string,
  maxTtl: number = 900,
): Promise<void> {
  try {
    const key = `${KEY_PREFIX}user_revoke:${userId}`;
    const revokedAt = Math.floor(Date.now() / 1000);
    await redis.set(key, revokedAt.toString(), 'EX', maxTtl);
    logger.info({ userId, revokedAt }, 'All tokens blacklisted for user');
  } catch (err) {
    logger.error({ err, userId }, 'Failed to blacklist all user tokens');
  }
}

/**
 * Check whether a token was issued before the user's "revoke-before"
 * timestamp (i.e. a blanket invalidation was performed).
 *
 * @param userId  - The user ID from the token payload.
 * @param iat     - The `iat` (issued-at) claim from the JWT, in epoch seconds.
 * @returns `true` if the token was issued before the revoke timestamp.
 */
export async function isUserTokenRevoked(
  userId: string,
  iat: number,
): Promise<boolean> {
  try {
    const key = `${KEY_PREFIX}user_revoke:${userId}`;
    const revokedAt = await redis.get(key);
    if (revokedAt === null) return false;
    return iat < parseInt(revokedAt, 10);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to check user token revocation — failing open');
    return false;
  }
}
