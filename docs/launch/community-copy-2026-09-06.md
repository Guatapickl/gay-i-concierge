# Homepage copy and member-only Community

Robert approved the remaining redesign and requested the exact homepage wording: “Discussions across channels about model releases, new research papers, personal projects, and sometimes NYC-specific topics”. Applied as supplied.

Removed “paper club” wording from the active homepage, event description, agenda template and fallback research channel label. Published announcements/resources/channel metadata had no matches. Existing channel IDs and discussions are preserved.

Community is absent from signed-out navigation. Middleware redirects signed-out /community and child URLs; the shared server layout also verifies the session cookie before rendering. Directory data APIs retain their existing authenticated field allowlist.

Live source 7870de6, Firebase rollout build-2026-09-06-007. Verified homepage copy, signed-out 307 redirects for directory/detail, rejected forged cookie, authenticated directory 200, and no Community link in the signed-out mobile menu. Temporary verification account deleted. Production build and 106 tests passed; targeted lint had zero errors and four existing warnings. See evidence/community-live-check.json.
