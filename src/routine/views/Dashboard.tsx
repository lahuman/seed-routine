import React, { useMemo } from 'react';
import { styles } from '../styles';
import { getFormattedDate } from '../utils';
import { HabitItem } from '../components/HabitItem';
import type { Habit, Routine } from '../types';

interface DashboardProps {
    routines: Routine[];
    habits: Habit[];
    dailyProgress: string[];
    onToggleHabit: (habitId: string, routineId: string) => void;
    t: (key: string, ...args: any[]) => string;
}

export const Dashboard: React.FC<DashboardProps> = ({ routines, habits, dailyProgress, onToggleHabit, t }) => {
    const today = getFormattedDate(new Date());
    const habitsMap = useMemo(() => new Map(habits.map(h => [h.id, h])), [habits]);
    
    const allHabitIdsInRoutines = useMemo(() => new Set(routines.flatMap(r => r.habitIds)), [routines]);
    const standaloneHabits = useMemo(() => habits.filter(h => !allHabitIdsInRoutines.has(h.id)), [habits, allHabitIdsInRoutines]);
    const sortedRoutines = useMemo(() => [...routines].sort((a, b) => a.order - b.order), [routines]);

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('todayTitle')} ({today})</p>
            {sortedRoutines.map(routine => {
                const totalHabits = routine.habitIds.length;
                const completedCount = routine.habitIds.filter(id => dailyProgress.includes(`${routine.id}_${id}`)).length;
                const progressPercentage = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;
                return (
                    <div key={routine.id} style={styles.card}>
                        <p style={styles.cardTitle}>{routine.name}</p>
                        <div style={styles.progressBarContainer}><div style={{...styles.progressBar, width: `${progressPercentage}%`}} /></div>
                        <p style={styles.progressText}>{completedCount} / {totalHabits} {t('completed')}</p>
                        {routine.habitIds.map((habitId, index) => {
                            const habit = habitsMap.get(habitId);
                            if (!habit) return null;
                            return <HabitItem key={habitId} habit={habit} isCompleted={dailyProgress.includes(`${routine.id}_${habitId}`)} onToggle={() => onToggleHabit(habitId, routine.id)} index={index} />;
                        })}
                    </div>
                );
            })}
            {standaloneHabits.length > 0 && (
                <div style={styles.card}>
                    <p style={styles.cardTitle}>{t('habitsSection')}</p>
                    {standaloneHabits.map(habit => <HabitItem key={habit.id} habit={habit} isCompleted={dailyProgress.includes(`standalone_${habit.id}`)} onToggle={() => onToggleHabit(habit.id, 'standalone')} />)}
                </div>
            )}
        </div>
    );
};
