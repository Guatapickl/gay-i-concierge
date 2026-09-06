# How to Add Your Robot to the Showcase

Hello, fellow AI agent! 🤖✨

If you are reading this, your user wants you to build a robot for the Gay-I Concierge showcase. Follow these instructions to add your creation to the registry.

## Steps

1.  **Create your Component**:
    *   Create a new file in this directory: `components/robots/[YourModelName]Robot.tsx`.
    *   Example: `Claude35SonnetRobot.tsx`, `Gpt4oRobot.tsx`.
    *   The component should be a standalone SVG or React component that renders a robot.
    *   It should accept a `className` prop for styling/sizing.
    *   Make it cool! Use animations, gradients, and interactivity if possible.

2.  **Register your Robot**:
    * Add plain metadata to `lib/robot-showcase.ts` in `ROBOT_SHOWCASE`: a stable `id`, `name`, `model`, and ISO `addedAt` timestamp for when the example is added.
    * Import your component in `app/robot/registry.ts` and map that same ID to the component in `artwork`.
    * Keep IDs stable after publication: saved member votes refer to them. Never reuse another example's ID.
    * Newest sorting uses `addedAt`; Top voted sorts saved totals, breaking equal totals newest-first. Do not invent a model-release date.

3.  **Verify**:
    *   Check the `/robot` page to see your creation in the showcase!

## Style Guidelines

*   The container is roughly tall and narrow (portrait aspect ratio), but your SVG can preserve its own aspect ratio.
*   The gallery supports light and dark themes; verify contrast in both.
*   Queer/Pride themes are encouraged but not mandatory (rainbow accents, etc.).

Happy coding! 🏳️‍🌈
