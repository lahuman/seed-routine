import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFormattedDate } from '../utils';
import { HabitItem } from '../components/HabitItem';
import type { Habit, Routine, Progress, RoutineGroup } from '../types';

const getCalendarDayColor = (rate: number, styles: { [key: string]: React.CSSProperties }) => {
    if (rate === 0) return styles.theme.background;
    if (rate < 0.3) return 'rgba(252, 165, 165, 0.8)';
    if (rate < 0.8) return 'rgba(147, 197, 253, 0.9)';
    return 'rgba(74, 222, 128, 1)';
};

interface StatisticsProps {
    habits: Habit[];
    routines: Routine[];
    routineGroups: RoutineGroup[];
    progressHistory: Progress[];
    t: (key: string, ...args: any[]) => string;
    language: string;
    styles: { [key: string]: React.CSSProperties };
}

export const Statistics: React.FC<StatisticsProps> = ({ habits, routines, routineGroups, progressHistory, t, language, styles }) => {
    const [displayDate, setDisplayDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const handleMonthChange = (offset: number) => {
        setDisplayDate(current => {
            const newDate = new Date(current);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const monthlyCalendarData = useMemo(() => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const progressMap = new Map(progressHistory.map(p => [p.date, p.completedHabits]));
        const calendarDays = [];
        
        for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
            calendarDays.push({ key: `empty-${i}`, empty: true });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(23, 59, 59, 999);
            const dateString = getFormattedDate(date);

            const habitsOnDate = habits.filter(h => h.createdAt ? h.createdAt.toDate() <= date : true);
            const habitsOnDateMap = new Map(habitsOnDate.map(h => [h.id, h]));
            const routinesOnDate = routines.filter(r => r.createdAt ? r.createdAt.toDate() <= date : true);

            const tasksForDay = new Set<string>();
            routinesOnDate.forEach(r => {
                r.habitIds.forEach(hId => {
                    if (habitsOnDateMap.has(hId)) {
                        tasksForDay.add(`${r.id}_${hId}`);
                    }
                });
            });

            const allHabitIdsInRoutinesOnDate = new Set(routinesOnDate.flatMap(r => r.habitIds));
            const standaloneHabits = habitsOnDate.filter(h => !allHabitIdsInRoutinesOnDate.has(h.id));
            standaloneHabits.forEach(h => tasksForDay.add(`standalone_${h.id}`));
            
            const totalTasks = tasksForDay.size;
            
            const progress = progressMap.get(dateString) || [];
            const validCompletedTasks = progress.filter(key => tasksForDay.has(key));
            const completedCount = validCompletedTasks.length;

            let completionRate = 0;
            if (totalTasks > 0) {
                completionRate = completedCount / totalTasks;
            }
            calendarDays.push({ key: dateString, day, completionRate, completedCount, totalTasks, isToday: dateString === getFormattedDate(new Date()) });
        }
        return calendarDays;
    }, [progressHistory, habits, routines, displayDate]);

    const selectedDayDetails = useMemo(() => {
        if (!selectedDate) return null;
    
        const parts = selectedDate.split('-').map(Number);
        const currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
        currentDate.setHours(23, 59, 59, 999);

        const habitsOnDate = habits.filter(h => h.createdAt ? h.createdAt.toDate() <= currentDate : true);
        const habitsOnDateMap = new Map(habitsOnDate.map(h => [h.id, h]));
        const routinesOnDate = routines.filter(r => r.createdAt ? r.createdAt.toDate() <= currentDate : true);

        const progress = progressHistory.find(p => p.date === selectedDate);
        const completedKeys = new Set(progress ? progress.completedHabits : []);
    
        const routineDetailsByGroup = routinesOnDate.reduce((acc, routine) => {
            const group = routine.groupId ? routineGroups.find(g => g.id === routine.groupId) : null;
            const groupName = group ? group.name : 'Ungrouped';

            if (!acc[groupName]) {
                acc[groupName] = [];
            }

            const habitsInRoutine = routine.habitIds.map(habitId => {
                const habit = habitsOnDateMap.get(habitId);
                return habit ? { ...habit, isCompleted: completedKeys.has(`${routine.id}_${habitId}`) } : null;
            }).filter((h): h is Habit & { isCompleted: boolean } => h !== null);

            if (habitsInRoutine.length > 0) {
                acc[groupName].push({ name: routine.name, habits: habitsInRoutine });
            }

            return acc;
        }, {} as { [key: string]: { name: string, habits: (Habit & { isCompleted: boolean })[] }[] });

        const allHabitIdsInRoutinesOnDate = new Set(routinesOnDate.flatMap(r => r.habitIds));
        const standaloneDetails = habitsOnDate
            .filter(h => !allHabitIdsInRoutinesOnDate.has(h.id))
            .map(habit => ({ ...habit, isCompleted: completedKeys.has(`standalone_${habit.id}`) }));
    
        return {
            date: selectedDate,
            routinesByGroup: routineDetailsByGroup,
            standalone: standaloneDetails
        };
    }, [selectedDate, progressHistory, routines, habits, routineGroups]);

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('statsTitle')}</p>
            <div style={styles.card}>
                <div style={styles.calendarNav}>
                    <button onClick={() => handleMonthChange(-1)} style={styles.transparentButton}><ChevronLeft size={20} color={styles.text?.color} /></button>
                    <p style={styles.cardTitle}>{t('calendarMonthTitle', displayDate.getFullYear(), displayDate.getMonth() + 1)}</p>
                    <button onClick={() => handleMonthChange(1)} style={styles.transparentButton}><ChevronRight size={20} color={styles.text?.color} /></button>
                </div>
                <div style={styles.calendarGrid}>
                    {t('calendarDays').map((day: string) => <div key={day} style={styles.calendarHeader}>{day}</div>)}
                    {monthlyCalendarData.map((day: any) => {
                        if (day.empty) return <div key={day.key}></div>;
                        return (
                            <div 
                                key={day.key} 
                                style={{
                                    ...styles.calendarDay, 
                                    backgroundColor: getCalendarDayColor(day.completionRate, styles), 
                                    ...(selectedDate === day.key && styles.calendarDaySelected)
                                }} 
                                onClick={() => setSelectedDate(day.key)}
                            >
                                {day.isToday && <div style={styles.calendarTodayMarker}></div>}
                                <span style={styles.calendarDayNumber}>{day.day}</span>
                                {day.totalTasks > 0 && (
                                     <span style={styles.calendarDayFraction}>
                                        {day.completedCount}/{day.totalTasks}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {selectedDayDetails && (
                <div style={styles.card}>
                    <p style={styles.cardTitle}>{t('dailyRecordTitle', selectedDayDetails.date)}</p>
                    {Object.entries(selectedDayDetails.routinesByGroup).map(([groupName, routines]) => (
                        <div key={groupName} style={{marginBottom: '16px'}}>
                            <h3 style={{...styles.cardTitle, color: styles.groupColor}}>{groupName}</h3>
                            {routines.map(routine => (
                                <div key={routine.name} style={{marginBottom: '16px'}}>
                                    <p style={styles.statsSubtitle}>{routine.name}</p>
                                    {routine.habits.map(habit => (
                                        <HabitItem key={habit.id} habit={habit} isCompleted={habit.isCompleted} onToggle={() => {}} showCheckbox={true} styles={styles} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                    {selectedDayDetails.standalone.length > 0 && (
                        <div style={{marginBottom: '16px'}}>
                            <p style={styles.statsSubtitle}>{t('habitsSection')}</p>
                            {selectedDayDetails.standalone.map(habit => (
                                 <HabitItem key={habit.id} habit={habit} isCompleted={habit.isCompleted} onToggle={() => {}} showCheckbox={true} styles={styles} />
                            ))}
                        </div>
                    )}
                    {Object.keys(selectedDayDetails.routinesByGroup).length === 0 && selectedDayDetails.standalone.length === 0 && (
                        <p style={styles.emptyStateSubText}>{t('noCompletedHabits')}</p>
                    )}
                </div>
            )}
        </div>
    );
};
