# ADR 0008: Web-First PWA Over Native Mobile
Date: 2026-02-15 | Status: Accepted

## Context
Real estate agents are mobile-first workers. They show properties, meet clients, and manage transactions from their phones throughout the day. Mobile access to CrestDesk is not optional — it is a core requirement.

Three approaches were evaluated:

1. **Native iOS + Android apps** — best UX and platform integration, but requires maintaining three codebases (web + iOS + Android), separate release cycles, App Store review delays (1-7 days per release), and platform-specific expertise (Swift/Kotlin).
2. **React Native / Flutter** — cross-platform mobile with shared codebase, but still requires App Store distribution, adds a framework layer, and diverges from the web stack.
3. **Progressive Web App (PWA)** — single codebase serves both desktop and mobile. Modern PWA capabilities cover 90%+ of native app functionality. Instant updates without App Store review. Can be installed to the home screen.

The platform is launching as a SaaS product. Speed to market is critical. The team's core expertise is in TypeScript and React. App Store approval and review processes would slow down the iteration cycle during the critical early growth phase.

## Decision
Build CrestDesk as a web-first Progressive Web App. The React (Next.js) web application is the primary interface for both desktop and mobile users. Native iOS and Android apps will be built later when SaaS licensing or enterprise contracts require App Store presence.

- The web app is built with responsive design — mobile is not an afterthought but a primary design target.
- A service worker provides offline capability for critical workflows: viewing saved contacts, accessing cached documents, queuing actions for sync.
- Web Push API delivers real-time notifications (new leads, contract updates, e-signature requests).
- The app manifest enables home screen installation with a full-screen experience (no browser chrome).
- Performance budgets enforce fast load times on mobile networks: <3s First Contentful Paint on 3G.
- Camera and GPS APIs support mobile-specific features: property photo upload, location-based listing search.

## Consequences

**Positive:**
- Single codebase for desktop and mobile — faster development, fewer bugs, unified feature parity.
- Instant updates — deploy to production and all users get the new version immediately. No App Store review delays.
- No App Store fees (Apple's 15-30% commission on in-app purchases does not apply to web subscriptions directed outside the app).
- Faster time to market — no need to hire iOS/Android specialists or maintain separate release pipelines.
- 90%+ of native app experience via PWA: push notifications, offline mode, home screen install, camera access, GPS.
- Works on any device with a modern browser — no platform lock-in.

**Negative:**
- iOS Safari has limited PWA support compared to Android Chrome: no background sync, limited push notification reliability, storage quotas are more restrictive.
- Some enterprise clients may require App Store presence as part of their procurement process. This is a known gap to be addressed when native apps are built.
- PWA install rates are lower than App Store downloads — users are less familiar with "Add to Home Screen" than downloading from an app store. Requires user education.
- No access to certain native APIs: NFC (for smart lockboxes), Bluetooth (for some showing services), advanced biometrics beyond WebAuthn.
- Push notification permission rates are lower on web than native apps. Users must explicitly grant permission, and browsers show permission prompts that can be intimidating.
- Performance on older/low-end mobile devices may lag behind native apps, especially for image-heavy listing views. Mitigated with lazy loading, image optimization, and virtual scrolling.
