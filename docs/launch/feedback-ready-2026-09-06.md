# GayIClub feedback readiness

The shared Send feedback widget is registered for `gayiclub`. Firebase account changes now fill the widget's editable reply email, clear it on sign-out/account switch, and preserve an alternate or cleared address across screenshot markup. Guests can still submit sign-in problems. Email is a reply address, not proof of identity or an owner credential. No Firebase token or member UID is sent to the shared relay.

Integration uses the existing widget's `pxfb-email` field and input event, with a shadow-root observer for composer recreation. Changes to that shared widget contract require rechecking this host adapter. No shared widget or relay deployment was needed. Privacy disclosure explains account-email autofill.

Praxis `.env` now contains the GayIClub project mapping (code `GIC`, Nexus project `Gay-I Club Concierge`, canonical workspace `/Volumes/Projects/gay-i-concierge`). Existing mappings were preserved; there were zero other override entries. The Nexus project name/path and relay token registration were verified. The daemon was restarted while executor occupancy and queue were both zero.

Live test: submitted a clearly labeled launch-check note and public-homepage screenshot from the real widget, without a reply address. Relay receipt `fb_mtqf6i7w_c47af939` became durable Praxis record `PX-GIC-1`, project `gayiclub`; metadata and screenshot were downloaded. Triage correctly classified the intentional test as `other / discard`, with zero Nexus tasks and no email recipient. Relay acknowledgement was confirmed by its removal from the pending queue.

Live account check: a temporary non-admin Firebase account signed in; the actual rendered field visibly contained its email and was editable. Signing out cleared the field and changed its label to the guest form. Browser read-only DOM snapshots do not expose the input's current value reliably; screenshots were used for this verification.

Source commits: `228a2d6` plus `e9ef764`. Six focused tests cover initial auth restoration, edits, clearing, re-rendering, sign-out, and account switching. TypeScript, scoped ESLint, and production build passed. The latest main changes, including both newly added showcase artworks, were incorporated before deployment.

Automated reply-email delivery to a real inbox was not exercised by this no-recipient test. The widget/relay uses the existing Praxis email workflow; this release does not grant public feedback owner-trusted execution.

Final production rollout: `gayiclub-web-build-2026-09-06-016`, source `e9ef764`, Cloud Build `6dcffd7a-f6ba-48e5-bc58-ae28560b6fcf`, successful and serving 100% of traffic. Full unit suite passed 206 tests (5 emulator-dependent cases skipped); final production build passed.

On that exact revision, changing the reply address and returning from screenshot markup preserved the edit visibly. A synthetic alternate-address receipt (`fb_mtqfhbx7_94f46429`) was deliberately acknowledged as discarded before processing. The browser automation's empty-string fill did not clear the visible input, so normal Select All + Backspace was used to test actual clearing. The subsequent accepted receipt `fb_mtqfipn2_18b93a3b` contained no email and no owner-trust flag; the widget showed its no-email success message. The temporary non-admin test account was signed out and deleted. No member received a test email.
