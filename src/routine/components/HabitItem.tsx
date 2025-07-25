import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { styles } from '../styles';

interface HabitItemProps {
    habit: { name: string };
    isCompleted: boolean;
    onToggle: () => void;
    index?: number;
    showCheckbox?: boolean;
}

export const HabitItem: React.FC<HabitItemProps> = ({ habit, isCompleted, onToggle, index, showCheckbox = true }) => (
    <div style={{...styles.habitItem, cursor: onToggle ? 'pointer' : 'default' }} onClick={onToggle}>
        {showCheckbox && (isCompleted ? <CheckCircle2 color="#10B981" size={24} /> : <Circle color="#9CA3AF" size={24} />)}
        <p style={{...styles.habitText, ...(isCompleted && styles.habitTextCompleted), marginLeft: showCheckbox ? 12 : 0 }}>
            {typeof index === 'number' ? `${index + 1}. ` : ''}{habit.name}
        </p>
    </div>
);
