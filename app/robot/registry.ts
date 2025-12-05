import Gemini3Robot from '@/components/robots/Gemini3Robot';
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
];
