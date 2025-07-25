import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, type User, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, deleteDoc, query, setDoc, serverTimestamp, arrayUnion, arrayRemove, where, documentId, updateDoc } from 'firebase/firestore';
import { Home, PlusSquare, ListChecks, BarChart2 } from 'lucide-react';

import { auth, db, appId } from './firebase';
import { translations } from './constants';
import { getFormattedDate } from './utils';
import { getStyles } from './styles';
import type { Habit, Routine, Progress, RoutineGroup } from './types';

import { Notification } from './components/Notification';
import { ConfirmationModal } from './components/ConfirmationModal';
import { LoginPage } from './components/LoginPage';
import { NavButton } from './components/NavButton';
import { Dashboard } from './views/Dashboard';
import { HabitManager } from './views/HabitManager';
import { RoutineBuilder } from './views/RoutineBuilder';
import { Statistics } from './views/Statistics';

const App = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard');
    const [language, setLanguage] = useState('ko');
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [habits, setHabits] = useState<Habit[]>([]);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [routineGroups, setRoutineGroups] = useState<RoutineGroup[]>([]);
    const [progressHistory, setProgressHistory] = useState<Progress[]>([]);
    
    const [notification, setNotification] = useState('');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => {} });

    const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    const t = (key: string, ...args: any[]): string => {
        const string = translations[language][key] || key;
        if (typeof string === 'function') {
            return string(...args);
        }
        return string;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("인증 실패:", error);
            setNotification('Login failed. Please try again.');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("로그아웃 실패:", error);
            setNotification('Logout failed. Please try again.');
        }
    };

    useEffect(() => {
        if (!isAuthReady || !user) return;

        const habitsQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/habits`));
        const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
            setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
        });

        const routinesQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/routines`));
        const unsubscribeRoutines = onSnapshot(routinesQuery, (snapshot) => {
            setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Routine)));
        });

        const routineGroupsQuery = query(collection(db, `artifacts/${appId}/users/${user.uid}/routine_groups`));
        const unsubscribeRoutineGroups = onSnapshot(routineGroupsQuery, (snapshot) => {
            setRoutineGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoutineGroup)));
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const progressQuery = query(
            collection(db, `artifacts/${appId}/users/${user.uid}/progress`),
            where(documentId(), '>=', getFormattedDate(thirtyDaysAgo))
        );
        const unsubscribeProgress = onSnapshot(progressQuery, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({ date: doc.id, ...doc.data() } as Progress));
            setProgressHistory(historyData);
        });

        return () => {
            unsubscribeHabits();
            unsubscribeRoutines();
            unsubscribeRoutineGroups();
            unsubscribeProgress();
        };
    }, [isAuthReady, user]);

    const dailyProgress = useMemo(() => {
        const todayString = getFormattedDate(new Date());
        const todayData = progressHistory.find(p => p.date === todayString);
        return todayData ? todayData.completedHabits : [];
    }, [progressHistory]);

    const handleToggleHabit = async (habitId: string, routineId: string = 'standalone') => {
        if (!user) return;
        const today = getFormattedDate(new Date());
        const progressDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/progress`, today);
        const completionKey = `${routineId}_${habitId}`;
        const isCompleted = dailyProgress.includes(completionKey);

        try {
            await setDoc(progressDocRef, {
                date: today,
                lastUpdated: serverTimestamp(),
                completedHabits: isCompleted ? arrayRemove(completionKey) : arrayUnion(completionKey)
            }, { merge: true });
        } catch (error) {
            console.error("진행 상황 업데이트 오류:", error);
        }
    };

    const handleDeleteHabit = async (habitId: string) => {
        if (!user) return;
        
        setConfirmModal({
            isOpen: true,
            message: t('deleteHabitConfirm'),
            onConfirm: async () => {
                try {
                    routines.forEach(routine => {
                        if (routine.habitIds.includes(habitId)) {
                            const routineDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/routines`, routine.id);
                            updateDoc(routineDocRef, {
                                habitIds: arrayRemove(habitId)
                            });
                        }
                    });
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/habits`, habitId));
                    setNotification(t('habitDeleted'));
                } catch (error) {
                    console.error("습관 삭제 처리 중 오류 발생: ", error);
                    setNotification(t('habitDeleteError'));
                }
            }
        });
    };

    if (!isAuthReady) {
        return <div style={styles.centerContainer}><p style={styles.loadingText}>Loading App...</p></div>;
    }

    if (!user) {
        return <LoginPage onLogin={handleLogin} t={t} styles={styles} />;
    }

    const renderView = () => {
        const props = { habits, routines, routineGroups, userId: user.uid, dailyProgress, onToggleHabit: handleToggleHabit, setNotification, setConfirmModal, t, language, styles };
        switch (currentView) {
            case 'habits':
                return <HabitManager habits={habits} userId={user.uid} onDeleteHabit={handleDeleteHabit} setNotification={setNotification} t={t} styles={styles} />;
            case 'routines':
                return <RoutineBuilder {...props} />;
            case 'statistics':
                return <Statistics {...props} progressHistory={progressHistory} />;
            case 'dashboard':
            default:
                return <Dashboard {...props} />;
        }
    };

    return (
        <div style={styles.container}>
            {notification && <Notification message={notification} onClose={() => setNotification('')} styles={styles} />}
            <ConfirmationModal 
                isOpen={confirmModal.isOpen} 
                message={confirmModal.message} 
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
                t={t}
                styles={styles}
            />
            <div style={styles.appHeader}>
                <div style={styles.appHeaderTop}>
                    <p style={styles.appHeaderTitle}>{t('appName')}</p>
                    <div style={styles.headerActions}>
                        <div style={styles.langSwitcher}>
                            <button onClick={() => setLanguage('ko')} style={language === 'ko' ? styles.langButtonActive : styles.langButton}>KO</button>
                            <button onClick={() => setLanguage('en')} style={language === 'en' ? styles.langButtonActive : styles.langButton}>EN</button>
                        </div>
                        <button onClick={handleLogout} style={styles.logoutButton}>{t('logout')}</button>
                    </div>
                </div>
                <p style={styles.appHeaderSubtitle}>{t('appSubtitle')}</p>
            </div>
            <div style={{...styles.content, overflowY: 'auto'}}>
                {renderView()}
            </div>
            <div style={styles.navigation}>
                <NavButton title={t('navToday')} icon={Home} active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} styles={styles} />
                <NavButton title={t('navHabits')} icon={ListChecks} active={currentView === 'habits'} onClick={() => setCurrentView('habits')} styles={styles} />
                <NavButton title={t('navRoutines')} icon={PlusSquare} active={currentView === 'routines'} onClick={() => setCurrentView('routines')} styles={styles} />
                <NavButton title={t('navStats')} icon={BarChart2} active={currentView === 'statistics'} onClick={() => setCurrentView('statistics')} styles={styles} />
            </div>
        </div>
    );
};

export default App;