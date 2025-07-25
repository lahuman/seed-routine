import React, { useEffect } from 'react';

interface NotificationProps {
    message: string;
    onClose: () => void;
    styles: { [key: string]: React.CSSProperties };
}

// 커스텀 알림 컴포넌트
export const Notification: React.FC<NotificationProps> = ({ message, onClose, styles }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div style={styles.notificationContainer}>
            <p style={styles.notificationText}>{message}</p>
        </div>
    );
};
