import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { styles } from '../styles';
import { db, appId } from '../firebase';
import { HabitItem } from '../components/HabitItem';
import type { Habit } from '../types';

interface HabitManagerProps {
    habits: Habit[];
    userId: string;
    onDeleteHabit: (habitId: string) => void;
    setNotification: (message: string) => void;
    t: (key: string) => string;
}

export const HabitManager: React.FC<HabitManagerProps> = ({ habits, userId, onDeleteHabit, setNotification, t }) => {
    const [newHabit, setNewHabit] = useState('');
    
    const handleAddHabit = async () => {
        const trimmedHabit = newHabit.trim();
        if (trimmedHabit === '') return;

        const isDuplicate = habits.some(habit => habit.name.toLowerCase() === trimmedHabit.toLowerCase());
        if (isDuplicate) {
            setNotification(t('duplicateHabitError'));
            return;
        }

        setNewHabit('');
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/habits`), { name: trimmedHabit, createdAt: serverTimestamp(), userId });
        } catch (error) {
            console.error("습관 추가 오류:", error);
            setNewHabit(trimmedHabit);
            setNotification(t('addHabitError'));
        }
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddHabit();
        }
    };

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('habitsTitle')}</p>
            <div style={styles.inputContainer}>
                <input 
                    style={styles.input} 
                    placeholder={t('addHabitPlaceholder')}
                    value={newHabit} 
                    onChange={(e) => setNewHabit(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button style={styles.addButton} onClick={handleAddHabit}><p style={styles.addButtonText}>{t('add')}</p></button>
            </div>
            {habits.map(habit => (
                <div key={habit.id} style={styles.listItem}>
                    <HabitItem 
                        habit={habit} 
                        isCompleted={false} 
                        onToggle={() => {}} 
                        showCheckbox={false} 
                    />
                    <button style={styles.transparentButton} onClick={() => onDeleteHabit(habit.id)}><Trash2 color="#EF4444" size={20} /></button>
                </div>
            ))}
        </div>
    );
};