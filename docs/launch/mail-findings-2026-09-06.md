# Mail findings — September 6, 2026

Robert authorized use of the Praxis or Gay I Club address for launch test messages.

- `praxis@vibeshiftai.com` is an active Google mailbox. SMTP authentication and IMAP inbox access both succeeded.
- `praxis+gayiclub@vibeshiftai.com` receives into that inbox. One clearly labeled launch test was sent and its exact Message-ID was found in INBOX. The test was marked read; no unrelated messages were read or changed and no membership messages were sent.
- Google accepted the test submitted with the club plus-address as From, but the received From was rewritten to `praxis@vibeshiftai.com`. The plus-address is verified for receiving; it is not verified as a preserved outbound From identity.
- `gayiclub.com` has no receiving MX records. There is no evidence of an active mailbox there. A verified Resend sending domain is separate from a receiving mailbox.
- The earlier authenticated Resend audit recorded `gayiclub.com` verified and `vibeshiftai.com` absent. A new end-to-end Resend test could not be sent: local app environment has no key, service-account access to the configured Secret Manager secret returned403, and the signed-in Firebase CLI could not access it. This does not prove the production sender is broken; delivery remains unverified.

Recommended current support address: `praxis+gayiclub@vibeshiftai.com`, handled in the working Praxis inbox. Confirmed SMTP sender: `praxis@vibeshiftai.com`. The website still uses Resend for its custom transactional emails; a switch to Praxis is not implemented or deployed by these tests. Firebase authentication email flows must also be tested separately.

This closes only the mailbox-existence/plus-address-receiving checks. Verification, sign-in link, reset, subscription and RSVP application flows are not proven by a transport self-test. Exact plus-address From, support routing/receipts, and the other readiness gates remain open.

Evidence: `evidence/mail-configuration.json`, `mail-delivery-test.json`, `resend-test-access.json`.
