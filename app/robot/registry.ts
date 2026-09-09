import Fable5Robot from '@/components/robots/Fable5Robot';
import Fable51Robot from '@/components/robots/Fable51Robot';
import Gemini3Robot from '@/components/robots/Gemini3Robot';
import Gpt51CodexMaxRobot from '@/components/robots/Gpt51CodexMaxRobot';
import Gpt6Robot from '@/components/robots/Gpt6Robot';
import Opus45Robot from '@/components/robots/Opus45Robot';
import PraxisCouncilRobot from '@/components/robots/PraxisCouncilRobot';
import { ROBOT_SHOWCASE, type RobotShowcaseEntry } from '@/lib/robot-showcase';
import type React from 'react';

export type RobotEntry = RobotShowcaseEntry & { component: React.ComponentType<{ className?: string }> };
const artwork: Record<string, RobotEntry['component']> = {
  'praxis-council-afterimage': PraxisCouncilRobot,
  'claude-fable-5-1': Fable51Robot,
  'gpt-6-open-seat': Gpt6Robot,
  'claude-fable-5': Fable5Robot,
  'claude-opus-4-5': Opus45Robot,
  'gpt-51-codex-max': Gpt51CodexMaxRobot,
  'gemini-3-unit-01': Gemini3Robot,
};
export const robots: RobotEntry[] = ROBOT_SHOWCASE.map(robot => ({ ...robot, component: artwork[robot.id] }));
