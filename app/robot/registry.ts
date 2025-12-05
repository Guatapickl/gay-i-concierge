import Gemini3Robot from '@/components/robots/Gemini3Robot';
import Gpt51CodexMaxRobot from '@/components/robots/Gpt51CodexMaxRobot';
import React from 'react';

export interface RobotEntry {
    id: string;
    name: string;
    model: string;
    component: React.ComponentType<{ className?: string }>;
}

export const robots: RobotEntry[] = [
    {
        id: 'gemini-3-unit-01',
        name: 'GAY-I UNIT 01',
        model: 'Gemini 3',
        component: Gemini3Robot,
    },
    {
        id: 'gpt-51-codex-max',
        name: 'Prismatic Pulse',
        model: 'GPT-5.1 Codex Max',
        component: Gpt51CodexMaxRobot,
    },
];
