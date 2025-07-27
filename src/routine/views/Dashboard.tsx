import React, { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { getFormattedDate } from '../utils';
import { HabitItem } from '../components/HabitItem';
import type { Habit, Routine, RoutineGroup } from '../types';

interface DashboardProps {
    routines: Routine[];
    routineGroups: RoutineGroup[];
    habits: Habit[];
    dailyProgress: string[];
    onToggleHabit: (habitId: string, routineId: string) => void;
    t: (key: string, ...args: any[]) => string;
    styles: { [key: string]: React.CSSProperties };
}

export const Dashboard: React.FC<DashboardProps> = ({ routines, routineGroups, habits, dailyProgress, onToggleHabit, t, styles }) => {
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>('all');
    const today = getFormattedDate(new Date());
    const habitsMap = useMemo(() => new Map(habits.map(h => [h.id, h])), [habits]);
    
    const sortedRoutineGroups = useMemo(() => [...routineGroups].sort((a, b) => a.order - b.order), [routineGroups]);

    const { routinesByGroup, ungroupedRoutines } = useMemo(() => {
        const groupMap: { [key: string]: Routine[] } = {};
        const ungrouped: Routine[] = [];

        routines.forEach(routine => {
            if (routine.groupId) {
                if (!groupMap[routine.groupId]) {
                    groupMap[routine.groupId] = [];
                }
                groupMap[routine.groupId].push(routine);
            } else {
                ungrouped.push(routine);
            }
        });

        for (const groupId in groupMap) {
            groupMap[groupId].sort((a, b) => a.order - b.order);
        }
        ungrouped.sort((a, b) => a.order - b.order);

        return { routinesByGroup: groupMap, ungroupedRoutines: ungrouped };
    }, [routines]);

    const allHabitIdsInRoutines = useMemo(() => new Set(routines.flatMap(r => r.habitIds)), [routines]);
    const standaloneHabits = useMemo(() => habits.filter(h => !allHabitIdsInRoutines.has(h.id)), [habits, allHabitIdsInRoutines]);

    const renderRoutine = (routine: Routine) => {
        const totalHabits = routine.habitIds.length;
        const completedCount = routine.habitIds.filter(id => dailyProgress.includes(`${routine.id}_${id}`)).length;
        const progressPercentage = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;
        return (
            <div key={routine.id} style={styles.card}>
                <div style={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <p style={styles.cardTitle}>{routine.name}</p>
                        {routine.notificationTime && (
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '12px' }}>
                                <Bell size={16} color={styles.subtext?.color} />
                                <span style={{ ...styles.subtext, marginLeft: '4px' }}>{routine.notificationTime}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div style={styles.progressBarContainer}><div style={{...styles.progressBar, width: `${progressPercentage}%`}} /></div>
                <p style={styles.progressText}>{completedCount} / {totalHabits} {t('completed')}</p>
                {routine.habitIds.map((habitId, index) => {
                    const habit = habitsMap.get(habitId);
                    if (!habit) return null;
                    return <HabitItem key={habitId} habit={habit} isCompleted={dailyProgress.includes(`${routine.id}_${habitId}`)} onToggle={() => onToggleHabit(habitId, routine.id)} index={index} styles={styles} />;
                })}
            </div>
        );
    };

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('todayTitle')} ({today})</p>

            <div style={styles.tabContainer}>
                <button 
                    style={selectedGroupId === 'all' ? styles.tabButtonActive : styles.tabButton}
                    onClick={() => setSelectedGroupId('all')}
                >
                    All
                </button>
                {sortedRoutineGroups.map(group => (
                    <button 
                        key={group.id} 
                        style={selectedGroupId === group.id ? styles.tabButtonActive : styles.tabButton}
                        onClick={() => setSelectedGroupId(group.id)}
                    >
                        {group.name}
                    </button>
                ))}
            </div>

            {selectedGroupId === 'all' && (
                <>
                    {sortedRoutineGroups.map(group => (
                        <div key={group.id}>
                            <h3 style={{...styles.cardTitle, color: styles.groupColor?.color}}>{group.name}</h3>
                            {routinesByGroup[group.id]?.map(renderRoutine)}
                        </div>
                    ))}
                    <h3 style={{...styles.cardTitle, color: styles.subtext?.color}}>Ungrouped</h3>
                    {ungroupedRoutines.map(renderRoutine)}
                </>
            )}

            {selectedGroupId && selectedGroupId !== 'all' && routinesByGroup[selectedGroupId]?.map(renderRoutine)}

            {standaloneHabits.length > 0 && (
                <div style={styles.card}>
                    <p style={styles.cardTitle}>{t('habitsSection')}</p>
                    {standaloneHabits.map(habit => <HabitItem key={habit.id} habit={habit} isCompleted={dailyProgress.includes(`standalone_${habit.id}`)} onToggle={() => onToggleHabit(habit.id, 'standalone')} styles={styles} />)}
                </div>
            )}
        </div>
    );
};
