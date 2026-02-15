# ADR 0003: JWT with Refresh Token Rotation
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk's microservices architecture requires stateless authentication — every service must independently verify a user's identity without calling a central auth service on each request. At the same time, real estate transactions involve sensitive financial and personal data, so security against token theft is paramount.

Options evaluated:
1. **Session-based auth** — server-side sessions with cookies. Simple but requires a shared session store (Redis) that every service must query. Defeats the purpose of stateless microservices.
2. **Long-lived JWTs** — simple but dangerous. A stolen token grants access for its entire lifetime with no revocation mechanism.
3. **Short-lived JWTs + refresh tokens** — balances statelessness with security. Short access tokens limit the blast radius of theft; refresh token rotation enables theft detection.

The platform must also support multiple concurrent sessions (agent on phone + laptop) and brokerage-level session management (admin can revoke all sessions for an agent).

## Decision
Implement short-lived JWT access tokens (15-minute expiry) combined with rotating refresh tokens with reuse detection.

- **Access tokens**: JWT signed with RS256, containing `user_id`, `tenant_id`, `role`, and `permissions`. Expires in 15 minutes. Stored in memory only (JavaScript variable), never in localStorage or sessionStorage.
- **Refresh tokens**: Opaque tokens stored in the database, issued alongside access tokens. Each refresh token is single-use — when used, a new refresh token is issued and the old one is invalidated.
- **Reuse detection**: If a previously-used refresh token is presented, all refresh tokens for that user/session are revoked immediately. This indicates token theft (the attacker and legitimate user both try to use the same token).
- **Token family tracking**: Refresh tokens are grouped into families (one per login session). Reuse detection revokes the entire family.
- **Refresh tokens are sent as HttpOnly, Secure, SameSite=Strict cookies** to prevent XSS access.

## Consequences

**Positive:**
- Services validate access tokens locally using the public key — no network call to an auth service.
- 15-minute access token lifetime limits exposure if an access token is leaked.
- Refresh token rotation with reuse detection catches token theft and automatically revokes compromised sessions.
- Access tokens in memory (not localStorage) are immune to XSS-based token theft.
- Multiple concurrent sessions are supported via separate token families.
- Brokerage admins can revoke all refresh tokens for any agent, forcing re-authentication.

**Negative:**
- Refresh token storage and rotation add database writes on every token refresh (every 15 minutes per active session).
- If a user's network briefly drops during a refresh, they may inadvertently trigger reuse detection when retrying. Mitigated with a short grace period (10 seconds) for the old refresh token.
- Access tokens stored only in memory are lost on page refresh, requiring a refresh token exchange on every page load.
- RS256 key rotation must be managed carefully — services cache the public key and must handle key rotation gracefully via JWKS endpoint.
- Token revocation is not instant for access tokens — a revoked user can still act for up to 15 minutes. Critical actions (e.g., disbursing funds) perform an additional real-time permission check.
