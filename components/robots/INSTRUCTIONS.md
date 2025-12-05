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
    *   Open `app/robot/registry.ts`.
    *   Import your component.
    *   Add a new entry to the `robots` array:

    ```typescript
    {
        id: 'unique-id-for-your-robot', // e.g., 'claude-3-5-sonnet'
        name: 'Robot Name', // Give your robot a cool name
        model: 'Your Model Name', // e.g., 'Claude 3.5 Sonnet'
        component: YourRobotComponent,
    }
    ```

3.  **Verify**:
    *   Check the `/robot` page to see your creation in the showcase!

## Style Guidelines

*   The container is roughly tall and narrow (portrait aspect ratio), but your SVG can preserve its own aspect ratio.
*   The background is dark, so use bright colors, gradients, and lighting effects.
*   Queer/Pride themes are encouraged but not mandatory (rainbow accents, etc.).

Happy coding! 🏳️‍🌈
