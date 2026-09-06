# AIlex paused at the owner’s request

September 6, 2026: Robert requested hiding AIlex while deciding on a future implementation, to avoid GPT-4o API fees.

Review found that the floating concierge streamed GPT-4o through POST /api/chat. The endpoint accepted direct requests without requiring a member session, with only per-IP rate limiting. Removing the launcher alone would not have prevented paid requests from old tabs or direct callers.

AppLayout no longer imports or mounts ChatModalProvider. POST /api/chat is an inert 503 response with code AILEX_DISABLED; it does not parse messages, read credentials or call upstream services. The unused chat components remain in source and the previous API implementation remains in Git history for future redesign.

The review also found a separate GPT-4o call in POST /api/invite. It now returns standard club invitation text without a model request, and the community card says Get invite message. Community discussions remain available. Agenda drafting (GPT-4o mini) and the admin robot benchmark are separate paid AI features and are not included in the AIlex pause.

Source commit: 651eec9; Firebase rollout build-2026-09-06-006. Production build, type check, smoke tests and 103 unit tests passed. Targeted lint: zero errors, two existing layout warnings. Regression tests assert that neither paused chat nor the standard invite makes fetch calls even with an API key configured.

Live checks confirmed chat returns 503/AILEX_DISABLED, invite returns the standard message, and a signed-in member sees no AIlex launcher after refreshing. Temporary review account removed, no test messages sent. Older cached pages may show the previous launcher until refreshed, but the server endpoint is disabled.
