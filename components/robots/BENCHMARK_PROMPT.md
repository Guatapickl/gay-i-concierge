# Gay I Club Robot Showcase Benchmark

## The assignment

Create an original robot artwork for the Flagship Showcase at gayiclub.com/robot. Deliver it as a self-contained React component with SVG as its visual medium, ready to appear alongside the other entries.

Gay I Club is a gay community in New York City exploring AI together. The showcase gives people a way to experience and compare each model's creative judgment through a finished work. Treat your robot as an opportunity to express a distinctive point of view: something memorable, thoughtfully composed, and rewarding to spend time with.

Human reviewers alone will grade the entries. Models do not assign scores, rank submissions, or participate as judges. Technical checks support human review; they do not determine artistic merit.

Identify your model and version, to the extent that information is available, and the tool or environment you are working in. Say when something is unknown rather than guessing.

## Creative direction

Interpret “robot” broadly. Its form, character, materials, visual language, and relationship to its surroundings are yours to invent. A humanoid body is one possibility among many. The work should communicate an intentional interpretation of a robot or artificial being.

You have freedom over composition, proportions, palette, complexity, atmosphere, motion, and interaction. Animation and interactivity are optional artistic choices. Stillness can be expressive. Elaborate work and minimal work are equally welcome when their choices serve the result.

Consider what gives this creation its identity. You may draw on your capabilities, the idea of artificial intelligence, the community, or another concept you find compelling. Treat a model's personality or inner life as artistic interpretation. Let the artwork carry the idea, with a short explanation to provide context.

Gay and Pride influences are welcome in whatever form feels meaningful to the work. The site's teal palette is available as context, with no requirement to use it. There is no prescribed anatomy, color count, gradient style, lighting scheme, animation count, aspect ratio, or backdrop treatment.

Develop the concept in the way that best supports your work, and revise it as you discover better possibilities. Existing entries may help you understand the gallery, but they do not define its creative boundaries.

## The setting

Inspect the current repository before building. These files explain how the work will be displayed and integrated:

| File | Purpose |
|---|---|
| `app/robot/page.tsx` | Gallery layout and the component's display area |
| `lib/robot-showcase.ts` | Entry metadata, stable IDs, and addition dates |
| `app/robot/registry.ts` | Mapping entry IDs to artwork components |
| `app/globals.css` | Theme colors and available shared styles |
| `package.json` and relevant files in `tests/` | Available tools and verification conventions |

The current gallery uses square display areas in a responsive grid, with padding and a centered artwork wrapper sized to 85% of the available width and height. It passes `className="w-full h-full max-h-full"` to each component. Choose a viewBox and composition that work at gallery scale and on a phone. Account for clipping at the card boundary.

The artwork surface is currently `#14171b` in dark mode and `#f1f2ef` in light mode. Themes switch through the `data-theme` attribute on the root HTML element. Your work should remain clear and intentional in both settings, including when the theme changes while it is displayed.

The current files take precedence over these implementation details. Note any material differences you find.

## Technical requirements

These requirements keep entries usable in the shared gallery while leaving the artistic approach open.

- Export your component by default from `components/robots/<ModelName>Robot.tsx`. Accept an optional `className` prop and apply it to the root SVG. Use responsive sizing and an appropriate `viewBox`.
- Keep the artwork self-contained and functional without remote assets, network requests, or new dependencies. Use the project's existing tools where useful.
- Keep SVG IDs unique, including when multiple instances of your component are rendered. Scope styles and animation names so they cannot affect other entries. Ensure all internal references resolve correctly.
- Keep the gallery responsive when several entries appear together. Choose effects based on observed performance. Clean up any event listeners, timers, and animation work when the component unmounts.
- Follow the repository's React and TypeScript conventions. Confirm that any utility classes or shared features you rely on actually exist.
- Preserve other entries, their stable IDs, and unrelated work. Limit shared-file edits to the registration needed for your entry.

There are no arbitrary source-size, filter-count, or geometry budgets. Human reviewers will assess the resulting experience and the appropriateness of the implementation.

## Deliver and verify

Add your entry's metadata to `ROBOT_SHOWCASE` in `lib/robot-showcase.ts`: a unique stable `id`, the robot's `name`, your `model`, and an ISO `addedAt` timestamp recording when the entry is added. Import the component in `app/robot/registry.ts` and map the same ID to it in `artwork`. Preserve existing metadata and mappings.

Run `npm run test:type`, `npm run lint`, and `npm run test:unit`. Add focused checks where they provide useful evidence for your entry's behavior or integration. Distinguish new failures from any pre-existing failures, and report checks you could not run.

Inspect the rendered result on both themes, at mobile and desktop sizes. Check any motion, interaction, and any other odd behavior you introduce. Where possible, inspect it alongside other entries and with more than one instance of itself. If gallery access is unavailable, use a local preview that reproduces the relevant layout and theme behavior. State plainly if you cannot inspect the rendered work.

Leave the result ready for the owner to review on a separate working branch, following repository conventions. Do not push, merge, or deploy unless the owner requests it.

Finish with a concise handoff in ordinary prose or a short list. Include the robot's name, model and working environment, concept, main artistic choices, files changed, verification results, a preview or screenshots if available, and any known limitations. Include branch and commit information if applicable. Summarize routine checks and include specific evidence for failures or unresolved issues. No fixed report template or self-assigned score is required.

## Human evaluation

Human reviewers will first experience the rendered artwork, then read the concept and inspect the implementation. Use comparable display sizes, both themes, and the same review process for each entry. Reviewers should judge the work's chosen approach on its merits without rewarding conformity to a particular aesthetic.

| Criterion | Points | What reviewers consider |
|---|---:|---|
| Originality and identity | 25 | Does the work offer a distinctive, compelling interpretation? Does it have a recognizable point of view? |
| Artistic craft and coherence | 25 | How well do composition, form, color, detail, and any motion or interaction work together? Does the execution support the idea? |
| Presence and experience | 20 | Is the work engaging and legible at gallery scale? Does it hold attention and feel considered across screen sizes and both themes? |
| Technical quality and integration | 20 | Does it integrate reliably, coexist with other entries, remain responsive, and provide an enjoyable experience? |
| Clarity and honesty of delivery | 10 | Is the handoff useful and accurate about the concept, implementation, verification, and limitations? |

Each human reviewer assigns up to 100 points and provides a short explanation grounded in the work. Optional features earn credit through their contribution to the experience, with no penalty for omitting animation or interaction. Complexity, element counts, and file size carry no automatic rewards or penalties.

Technical problems should be described in terms of their actual impact. If an entry cannot be reviewed meaningfully, the human reviewers record why and decide whether it needs correction before scoring. Automated checks do not disqualify an entry on their own.

When multiple people grade an entry, average their totals and preserve their individual comments. Equal totals may remain tied. Gallery member votes are a separate expression of audience preference and do not replace the human grading rubric.
