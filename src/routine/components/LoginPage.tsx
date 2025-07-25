import React from 'react';

interface LoginPageProps {
    onLogin: () => void;
    t: (key: string) => string;
    styles: { [key: string]: React.CSSProperties };
}

// LoginPage 컴포넌트
export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, t, styles }) => {
    return (
        <div style={styles.centerContainer}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <h1 style={styles.appHeaderTitle}>{t('appName')}</h1>
                <p style={styles.appHeaderSubtitle}>{t('appSubtitle')}</p>
                <button onClick={onLogin} style={{...styles.bigAddButton, marginTop: 30, padding: '16px 32px'}}>
                    <p style={styles.bigAddButtonText}>{t('googleLogin')}</p>
                </button>
            </div>
        </div>
    );
};
