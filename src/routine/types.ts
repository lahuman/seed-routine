import { Timestamp } from 'firebase/firestore';

export interface Habit {
    id: string;
    name: string;
    createdAt: Timestamp;
    userId: string;
}

export interface Routine {
    id: string;
    name: string;
    habitIds: string[];
    userId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    order: number;
}

export interface Progress {
    date: string;
    completedHabits: string[];
    lastUpdated: Timestamp;
}
