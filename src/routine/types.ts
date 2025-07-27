import { Timestamp } from 'firebase/firestore';

export interface Habit {
    id: string;
    name: string;
    createdAt: Timestamp;
    userId: string;
}

export interface RoutineGroup {
    id: string;
    name: string;
    userId: string;
    createdAt: Timestamp;
    order: number;
}

export interface Routine {
    id: string;
    name: string;
    habitIds: string[];
    userId: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    order: number;
    groupId?: string | null;
    notificationTime?: string;
}

export interface Progress {
    date: string;
    completedHabits: string[];
    lastUpdated: Timestamp;
}
