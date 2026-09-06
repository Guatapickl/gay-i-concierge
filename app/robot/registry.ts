import Fable5Robot from '@/components/robots/Fable5Robot';
import Gemini3Robot from '@/components/robots/Gemini3Robot';
import Gpt51CodexMaxRobot from '@/components/robots/Gpt51CodexMaxRobot';
import Opus45Robot from '@/components/robots/Opus45Robot';
import { ROBOT_SHOWCASE, type RobotShowcaseEntry } from '@/lib/robot-showcase';
import type React from 'react';

export type RobotEntry = RobotShowcaseEntry & { component: React.ComponentType<{ className?: string }> };
const artwork: Record<string, RobotEntry['component']> = {
  'claude-fable-5': Fable5Robot,
  'claude-opus-4-5': Opus45Robot,
  'gpt-51-codex-max': Gpt51CodexMaxRobot,
  'gemini-3-unit-01': Gemini3Robot,
};
export const robots: RobotEntry[] = ROBOT_SHOWCASE.map(robot => ({ ...robot, component: artwork[robot.id] }));
