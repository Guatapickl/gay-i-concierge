# Robert’s live-site checklist

Gay I Club · September 6, 2026

## Your next steps

- [ ] Review [gayiclub.com](https://gayiclub.com) on your phone and computer. Sign in with your normal club account. Try light mode and type in “What should we discuss?” and other forms.
- [x] Confirm September poll dates: **September 12, 13, 19, and 20**. These are saved; the last weekend is excluded.
- [ ] Open [September’s poll](https://gayiclub.com/vote/september-2026). When ready, use the admin control to email members the invitation. No synthetic poll invitations were broadcast during testing.
- [ ] When voting is finished, choose the date and explicitly enter the meeting time in New York time. Confirm location/agenda and book the meeting. Dates are not booked automatically.
- [ ] After each meeting, answer the Praxis availability questionnaire for the following month. Mark every offered Saturday/Sunday Available or Unavailable. Only your available dates become a member poll. No response or no available dates means no member poll.
- [ ] Review [News](https://gayiclub.com/news). Use Remove to delete an item, Check sources now for an immediate refresh, Save for personal bookmarks, and Share to pass along a source link.
- [ ] Check real email delivery to your inbox: verification, sign-in link, password reset, opt-in/opt-out, and RSVP confirmation. These delivery checks remain separate from automated code tests. Avoid using the membership as a test list.
- [ ] Review the public Privacy Policy, Terms of Use and Accessibility pages, and confirm who handles moderation/account requests at praxis+gayiclub@vibeshiftai.com.
- [ ] Send your relaunch announcement when you are happy with the live review. Include the sign-in URL and September poll link.
- [ ] Submit [the sitemap](https://gayiclub.com/sitemap.xml) in your Google Search Console property, if desired.

## How the automations run

- News collection runs at **8 a.m. America/New_York daily** from OpenAI, Google AI, and MIT News. Deleted source URLs stay suppressed on future refreshes. Members can save and share; only admins can remove/collect.
- The meeting workflow checks at **9 a.m. America/New_York daily**. After a booked meeting has ended and the next local day arrives, it asks for your following-month weekend availability through Praxis. One workflow is created per target month, including month-end meetings.
- Member voting normally lasts **seven days**, or ends before the earliest offered date if sooner. Voting deadlines are enforced on the server. September’s restored poll has no automatic closing date; you decide when to book it.
- All members see published polls in the site. Invitation email respects subscription preferences and excludes you from the automatic member invitation.
- The cloud schedule runs independently of ChatGPT. Owner questionnaire delivery and answer forwarding use the existing Praxis daemon and feedback relay; keep Praxis running on its host. A temporary outage retries safely, but an expired questionnaire needs operator attention.
- AIlex uses **OpenAI GPT-4o**, displayed in its chat interface. This label comes from the same constant used by its API request.

## Already handled

- Full redesign and live deployment authorized; no local test server is needed for your review.
- Old calendar events and recurring-series creation removed after a private backup. September’s four confirmed options restored.
- Light-theme textareas use the app’s theme colors. Sign in is the homepage’s primary action; Sign up is a smaller link.
- Private owner answers remain server-only. Retry protection covers owner-question delivery, callbacks, poll creation, and invitation queue entries.

## Remaining support follow-ups

Praxis’s mailbox/plus-address has received an authorized test. Gayiclub.com is a verified **sending** domain in Resend but has no receiving MX records. Application mail uses `VibeShift AI Support <noreply@gayiclub.com>` with Reply-To `praxis+gayiclub@vibeshiftai.com`. The support beta-interest checkbox still saves locally; cross-project contact sync and automatic account-request receipts are separate engineering follow-ups. Earlier “not ready” audit notes describe pre-release gaps; see the current release and automation notes for what is live versus still pending.
