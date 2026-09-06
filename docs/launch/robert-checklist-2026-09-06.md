# Robert’s relaunch checklist

Gay I Club · September 6, 2026

## Before you announce the relaunch

- [x] Approve the full supplied redesign. Confirmed in this task.
- [ ] Review the finished preview on your phone and computer: landing page, signed-in home, calendar, hub, directory and profile. Use your real account only in the final preview connected to the live Firebase project; the local test environment contains clearly labeled fixtures.
- [ ] Confirm the first meeting or date poll: dates, time zone (New York), location, RSVP expectations and organizer. Earlier notes proposed September 12, 13, 19 and 20; confirm those are still the choices you want.
- [ ] Review the actual event and resource content. Remove or archive obsolete/test content through the normal admin workflow after identifying exact records. The mockup’s example people/events are not launch content.
- [ ] Confirm who receives and handles support and moderation requests. The published contact is praxis+gayiclub@vibeshiftai.com. Verify a message reaches the inbox and a reply reaches you. Praxis feedback routing is also pending engineering configuration; this is not a task you need to implement. Automatic account-request receipts and cross-project beta syncing are not implemented yet.
- [ ] Review the Privacy Policy, Terms of Use and Accessibility pages. In particular: adult membership, member-visible profiles/content, AI processing, feedback screenshots/voice/logs, retention and reviewed account requests. Current retention wording describes the implementation; it does not promise an automatic purge schedule.
- [ ] Complete the real-inbox checks: email verification, magic link, password reset, update opt-in/opt-out, and RSVP confirmation. Check inbox and spam, sender name, reply address and destination links. Automated/local tests do not prove delivery to you. Do not email the membership as a test.
- [ ] If exact fleet sender compliance is required for today, verify vibeshiftai.com in the sending Resend account or connect the approved mailbox sender. The currently verified sender domain is gayiclub.com; the release uses neutral “VibeShift AI Support” there with the plus-address as Reply-To.
- [ ] Resolve the support-backbone gaps in the readiness report, or explicitly decide which may follow after launch. A profile beta checkbox currently saves interest locally; it does not sync contacts cross-project.
- [ ] Approve the final readiness report and release window after its blocking checks are resolved. This authorizes release of the reviewed build. No DNS change is currently expected; any exact DNS changes would be presented separately.

## After the release is verified live

- [ ] Sign in once at gayiclub.com on your phone; confirm profile, date voting, RSVP and calendar export.
- [ ] Publish or send your relaunch announcement only after the live checks pass. Include the correct club URL, what members should do first, and meeting/poll deadline.
- [ ] Submit the sitemap in Google Search Console if you own the property: https://gayiclub.com/sitemap.xml. If the property is not verified, complete the ownership step in your Google account.
- [ ] Check the support inbox and any failed email deliveries during the first day.
- [ ] Review broken links/404s and member feedback about two weeks after launch.

## Already handled / not work you need to repeat

- Located the actual Firebase app and all 14 redesign references.
- Made an isolated redesign branch and retained the original source commit.
- Privately backed up Firebase user records, Firestore documents and current DNS records; captured old-site screenshots.
- Verified the existing apex and www custom domains have active Firebase certificates. The site already runs on Firebase App Hosting.
- Registered Gay I Club’s feedback submission token with the existing relay.

Do not follow the old Supabase restoration or Netlify setup steps in archived launch notes. They describe the platform before the September 4 migration.

## Current verification

48 tests pass, production builds pass, lint has zero errors (46 warnings). Lighthouse:94 performance / 100 SEO / 100 accessibility / 100 best practices in a local production-host simulation. Final public accessibility scan: 6 pages, zero violations. Fifteen main member views fit mobile/tablet/desktop widths. These results do not establish live email delivery or completed platform integration. The independent launch verdict is currently not ready; see [readiness report](readiness-2026-09-06.md).

## Email check update

- [x] Confirm Praxis inbox access and delivery to praxis+gayiclub@vibeshiftai.com. One authorized test arrived.
- [ ] Complete actual application email-flow tests; the mailbox self-test alone does not prove them.

Google rewrote the submitted plus-address From to praxis@vibeshiftai.com. Gayiclub.com has no receiving MX records. See [mail findings](mail-findings-2026-09-06.md); the site still uses Resend, and that end-to-end delivery retest is pending credential access.
