# Gay I Club feedback routing: operator handoff

**Resolved September 6, 2026:** the mapping below is configured and the restarted daemon ingested live widget receipt PX-GIC-1 under GayIClub. See `feedback-ready-2026-09-06.md` for current evidence. The remaining text is the historical handoff, including separate email/support issues.

Source inspection and read-only checks: 2026-09-06. No Praxis configuration, process, or registry was changed by this follow-up.

## Runtime mapping requires a restart with the current implementation

`/Volumes/Projects/Praxis/src/config.ts:854` exposes `feedbackProjectsJson` as a getter over `process.env.FEEDBACK_PROJECTS_JSON`. `/Volumes/Projects/Praxis/src/feedback/projects.ts:75` caches the merged mapping after first load. The exported reset function at line 155 is marked a test hook and has no production caller in the inspected source.

The existing `update_config` tool (`src/tools/core-tools.ts:983`) supports positive numeric limits/iterations only. It cannot write this JSON string or invalidate the feedback mapping cache. No authenticated hot-update HTTP contract for this mapping was found. Do not attempt an undocumented environment/config mutation API.

Environment load order (`src/env.ts:15–17,29–33`): process environment > `/Volumes/Projects/.fleet-env` > repo `.env`. Neither inspected default fleet file nor repo `.env` currently defines this mapping override. A custom launch environment or FLEET_ENV_PATH was not inspected.

## Exact intended configuration

After confirming the current Nexus project name remains `Gay-I Club Concierge`, append this single line to `/Volumes/Projects/Praxis/.env`:

```dotenv
FEEDBACK_PROJECTS_JSON='[{"id":"gayiclub","code":"GIC","nexusProjectName":"Gay-I Club Concierge","workspace":"/Volumes/Projects/gay-i-concierge","displayName":"Gay I Club"}]'
```

If an override exists by the time this handoff is applied, parse its existing JSON array, preserve all other entries, and upsert the object by `id: gayiclub`. Do not replace other projects' mappings. `GIC` is the proposed trace code, not a preexisting registry value. Reconfirm the executor workspace if the relaunch worktree rather than the canonical checkout should own subsequent work.

This is separate from the public relay-token registry, which the main launch task has now registered. It does not require rewriting `FEEDBACK_PROJECT_TOKENS` or re-registering the token. The public widget config lives at `/Users/robertwashko/Documents/ChatGPT/GayIClub/relaunch/lib/feedback-config.ts`.

At a coordinated restart point, the repository's `AGENTS.md` prescribes:

```sh
launchctl kickstart -k gui/$(id -u)/com.praxis.bot
```

Do not run that while it would disrupt active work without coordination. After restart, verify feedback routing resolves `gayiclub` to the intended Nexus project/workspace. A real feedback submission may trigger workflow/messages and should use the launch task's authorized test procedure.

## Sender-domain result

Read-only authenticated `GET https://api.resend.com/domains` using the relaunch environment's existing key returned HTTP 200 and one domain:

| Domain | Status |
|---|---|
| gayiclub.com | verified |

`vibeshiftai.com` was absent from this account's returned domain list. Therefore a Resend `From: praxis+gayiclub@vibeshiftai.com` is not ready based on this evidence. A Reply-To address has a different role and does not establish sender-domain verification. To comply with the plus-address sender standard, verify the VibeShiftAI domain for this sending account or use the existing authorized mailbox backend after confirming its actual sending contract. No email was sent and no domain was added or modified.
