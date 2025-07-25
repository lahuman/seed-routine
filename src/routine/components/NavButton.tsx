import React from 'react';

interface NavButtonProps {
    title: string;
    icon: React.ElementType;
    active: boolean;
    onClick: () => void;
    styles: { [key: string]: React.CSSProperties };
}

export const NavButton: React.FC<NavButtonProps> = ({ title, icon: Icon, active, onClick, styles }) => (
    <button onClick={onClick} style={{...styles.navButton, ...(active && styles.navButtonActive)}}>
        <Icon color={active ? styles.navButtonTextActive.color : styles.navButtonText.color} size={24} />
        <p style={{...styles.navButtonText, ...(active && styles.navButtonTextActive)}}>{title}</p>
    </button>
);