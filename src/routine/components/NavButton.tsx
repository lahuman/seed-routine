import React from 'react';
import { styles } from '../styles';

interface NavButtonProps {
    title: string;
    icon: React.ElementType;
    active: boolean;
    onClick: () => void;
}

export const NavButton: React.FC<NavButtonProps> = ({ title, icon: Icon, active, onClick }) => (
    <button onClick={onClick} style={{...styles.navButton, ...(active && styles.navButtonActive)}}>
        <Icon color={active ? '#3B82F6' : '#4B5563'} size={24} />
        <p style={{...styles.navButtonText, ...(active && styles.navButtonTextActive)}}>{title}</p>
    </button>
);