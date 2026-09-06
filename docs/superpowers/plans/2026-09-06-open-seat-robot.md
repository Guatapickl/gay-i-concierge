# The Open Seat implementation plan

**Goal:** Submit an original SVG robot to the Flagship Showcase on a separate review branch.

**Design:** A brass public-service automaton makes its own body into a bench. An angled, lamp-like head looks toward the empty seat; an open palm invites company. The Pride colors are structural seat slats. A quiet, graphic composition with hard-edged metal shading, ceramic teal, and a circular dusk backdrop keeps the silhouette legible at gallery size. Following the owner's direction to add animation as appropriate, the eye now glances and blinks while the bench stays planted. Its whole composition is available without interaction.

The benchmark delegates creative decisions to the entrant. Alternatives considered were a kinetic signal-flower (less grounded in human welcome) and a subway-token robot (more literal NYC imagery). The bench gives the empty space a purpose.

**Architecture:** One client React component using `useId` for SVG resources and accessible labeling; internal styles target only its own root. Theme-aware CSS variables update immediately from the root `data-theme` attribute. Two entry-specific CSS animations move the pupil and shutter, with an open-eye fallback for reduced motion. No assets, dependencies, timers, effects, filters, or controls. The shared changes are the metadata row and component registration, plus updating chronological expectations in existing tests.

**Tech stack:** Existing React 19, TypeScript, SVG, Vitest, Vite, and Tailwind/PostCSS.

- [x] Add focused integration tests for registration, responsive SVG, accessible labels, and reference integrity across two instances. Run them before implementing to observe the missing-entry failure.
- [x] Create `components/robots/Gpt6Robot.tsx`, register `gpt-6-open-seat` in `lib/robot-showcase.ts` and `app/robot/registry.ts`, and preserve existing entries and their order relative to one another.
- [x] Add a local Vite preview using the actual registered React components and gallery sizing. Show one copy alongside existing entries and a second copy to check resource isolation. Compile the actual shared CSS and provide live theme switching.
- [x] Inspect at 390px and 1440px widths in both themes, inspect the enlarged composition, and observe the glance and blink. Record screenshots and limitations.
- [x] Run `npm run test:type`, `npm run lint`, and `npm run test:unit`; compare against baseline. Obtain technical review, inspect the scoped diff, and write the handoff. Keep the separate review branch and worktree without pushing, merging, or deploying.

**Baseline:** Commit `a1dd572`. Type checking passes; lint exits zero with 37 existing warnings; 194 unit tests pass and five emulator-dependent tests are skipped.
