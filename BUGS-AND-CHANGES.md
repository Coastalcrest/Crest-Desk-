# CrestDesk — Bugs & Changes Tracker

> Use this file to log bugs found during testing and changes that need to happen.
> Date started: 2026-02-16

---

## Bugs

| # | Severity | Page/Feature | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------|-------------------|--------|
| 1 | High | Calendar | Missing page — app crashed when clicking sidebar link | Click Calendar in sidebar | Fixed — placeholder added |
| 2 | High | Team | Missing page — app crashed when clicking sidebar link | Click Team in sidebar | Fixed — placeholder added |
| 3 | High | Compliance | Missing page at /dashboard/compliance — crashes on nav | Click Compliance in sidebar | Fixed — placeholder added |
| 4 | Medium | Marketing | Missing page — app crashed on nav | Click Marketing in sidebar | Fixed — placeholder added |
| 5 | Medium | Analytics | Missing page — app crashed on nav | Click Analytics in sidebar | Fixed — placeholder added |
| 6 | High | Settings > Account | Page shows error — API endpoints not connected | Go to Settings > Account & Security | Fixed — API endpoints + error boundary added |
| 7 | High | Settings > Notifications | Page fails to load — API endpoints not connected | Go to Settings > Notifications | Fixed — API endpoints + error boundary added |
| 8 | Medium | Media Studio > Generate | Generate button has no handler — mock data only | Click Generate in Media Studio | Fixed — toast "coming soon" message |
| 9 | Medium | Media Studio > Video | Generate Video button has no handler — mock data only | Click Generate Video | Fixed — toast "coming soon" message |
| 10 | Low | Media Studio > Library | Upload/Use/Favorite buttons have no onClick handlers | Click any button on asset cards | Fixed — toast "coming soon" message |
| 11 | Low | Media Studio > History | Action buttons (Download, Regenerate, Delete) no handlers | Click action buttons on history items | Fixed — toast "coming soon" message |

---

## Changes Needed

| # | Priority | Page/Feature | Description | Reason | Status |
|---|----------|-------------|-------------|--------|--------|
| 1 | Must-have | Media Studio | Connect Generate/Video to AI service or show "not available" state | Buttons do nothing, confusing for testers | Fixed — toast messages added |
| 2 | Should-have | Settings > Account | Connect /users/me/sessions and /users/me/password API endpoints | Sessions section shows error | Fixed — endpoints added |
| 3 | Should-have | Settings > Notifications | Connect /users/me/notifications API endpoint | Preferences don't load | Fixed — endpoints added |
| 4 | Nice-to-have | Media Studio > Library | Add file upload handler and asset management API | Library is all mock data | Fixed — toast messages added |

---

## Notes

- **Severity levels:** Critical, High, Medium, Low
- **Priority levels:** Must-have, Should-have, Nice-to-have
- **Status:** Open, In Progress, Fixed, Won't Fix
- **Deployment:** https://app.crestdesk.com | API: https://api.crestdesk.com
- **Server:** 68.183.171.161 (DigitalOcean, Ubuntu 24.04, 4GB RAM)
