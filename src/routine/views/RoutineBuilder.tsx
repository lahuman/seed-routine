import React, { useState, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
// MODIFIED: dnd 관련 import 삭제, 아이콘 추가
import { Edit3, Trash2, X, CheckCircle2, Circle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
// DELETED: import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { styles } from '../styles';
import { db, appId } from '../firebase';
import type { Habit, Routine } from '../types';

interface RoutineBuilderProps {
    habits: Habit[];
    routines: Routine[];
    userId: string;
    setConfirmModal: (modal: { isOpen: boolean; message: string; onConfirm: () => void; }) => void;
    setNotification: (message: string) => void;
    t: (key: string) => string;
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ habits, routines, userId, setConfirmModal, setNotification, t }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
    const [newRoutineName, setNewRoutineName] = useState('');
    const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

    const habitsMap = useMemo(() => new Map(habits.map(h => [h.id, h])), [habits]);
    const sortedRoutines = useMemo(() => [...routines].sort((a, b) => a.order - b.order), [routines]);

    const closeModal = () => {
        setModalVisible(false);
        setEditingRoutine(null);
        setNewRoutineName('');
        setSelectedHabits([]);
    };

    const handleEditRoutine = (routine: Routine) => {
        setEditingRoutine(routine);
        setNewRoutineName(routine.name);
        setSelectedHabits(routine.habitIds);
        setModalVisible(true);
    };

    const handleDeleteRoutine = (routineId: string) => {
        setConfirmModal({
            isOpen: true,
            message: t('deleteRoutineConfirm'),
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/routines`, routineId));
                    setNotification(t('routineDeleted'));
                } catch (error) {
                    console.error("루틴 삭제 오류:", error);
                    setNotification(t('routineDeleteError'));
                }
            }
        });
    };

    const handleSaveRoutine = async () => {
        if (newRoutineName.trim() === '' || selectedHabits.length === 0) {
            setNotification(t('routineValidationError'));
            return;
        }
        
        const routineData = {
            name: newRoutineName.trim(),
            habitIds: selectedHabits,
            userId: userId,
        };

        try {
            if (editingRoutine) {
                const routineDocRef = doc(db, `artifacts/${appId}/users/${userId}/routines`, editingRoutine.id);
                await setDoc(routineDocRef, { ...routineData, updatedAt: serverTimestamp() }, { merge: true });
                setNotification(t('updateRoutineSuccess'));
            } else {
                const newOrder = routines.length > 0 ? Math.max(...routines.map(r => r.order)) + 1 : 0;
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/routines`), { ...routineData, createdAt: serverTimestamp(), order: newOrder });
                setNotification(t('saveRoutineSuccess'));
            }
            closeModal();
        } catch (error) {
            console.error("루틴 저장 오류:", error);
            setNotification(t('saveRoutineError'));
        }
    };

    // DELETED: onDragEnd 함수 삭제

    // NEW: 순서 변경을 처리하는 함수
    const handleMoveRoutine = async (currentIndex: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === sortedRoutines.length - 1)
        ) {
            return; // 맨 위에서 위로, 맨 아래에서 아래로 이동 불가
        }

        const reorderedRoutines = [...sortedRoutines];
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        // 배열에서 두 아이템 위치 교환
        const temp = reorderedRoutines[currentIndex];
        reorderedRoutines[currentIndex] = reorderedRoutines[targetIndex];
        reorderedRoutines[targetIndex] = temp;
        
        const batch = writeBatch(db);
        reorderedRoutines.forEach((routine, index) => {
            const routineRef = doc(db, `artifacts/${appId}/users/${userId}/routines`, routine.id);
            batch.update(routineRef, { order: index });
        });

        try {
            await batch.commit();
            setNotification("루틴 순서가 변경되었습니다.");
        } catch (error) {
            console.error("루틴 순서 업데이트 오류:", error);
            setNotification("루틴 순서 변경에 실패했습니다.");
        }
    };

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('routinesTitle')}</p>
            <button style={styles.bigAddButton} onClick={() => { setEditingRoutine(null); setModalVisible(true); }}><p style={styles.bigAddButtonText}>{t('newRoutine')}</p></button>
            
            {/* MODIFIED: DragDropContext 및 관련 컴포넌트 제거 */}
            <div>
                {sortedRoutines.map((routine, index) => (
                    <div key={routine.id} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <p style={styles.cardTitle}>{routine.name}</p>
                            <div>
                                {/* NEW: 순서 변경 버튼 추가 */}
                                <button 
                                    onClick={() => handleMoveRoutine(index, 'up')} 
                                    style={styles.transparentButton} 
                                    disabled={index === 0}
                                >
                                    <ArrowUpCircle size={18} color={index === 0 ? "#D1D5DB" : "#4B5563"} />
                                </button>
                                <button 
                                    onClick={() => handleMoveRoutine(index, 'down')} 
                                    style={styles.transparentButton} 
                                    disabled={index === sortedRoutines.length - 1}
                                >
                                    <ArrowDownCircle size={18} color={index === sortedRoutines.length - 1 ? "#D1D5DB" : "#4B5563"} />
                                </button>
                                <button onClick={() => handleEditRoutine(routine)} style={{...styles.transparentButton, marginLeft: '8px'}}><Edit3 size={18} color="#4B5563" /></button>
                                <button onClick={() => handleDeleteRoutine(routine.id)} style={styles.transparentButton}><Trash2 size={18} color="#EF4444" /></button>
                            </div>
                        </div>
                        {routine.habitIds.map((habitId, idx) => {
                            const habit = habitsMap.get(habitId);
                            return <div key={habitId} style={styles.routineHabitItem}><p style={styles.routineHabitText}>{idx + 1}. {habit ? habit.name : 'Unknown Habit'}</p></div>;
                        })}
                    </div>
                ))}
            </div>

            {modalVisible && (
                <div style={styles.modalContainer}>
                    <div style={styles.modalContent}>
                        <button style={styles.closeButton} onClick={closeModal}><X color="#4B5563" size={24} /></button>
                        <p style={styles.modalTitle}>{editingRoutine ? t('modalEditRoutineTitle') : t('modalNewRoutineTitle')}</p>
                        <input style={styles.input} placeholder={t('routineNamePlaceholder')} value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} />
                        <p style={styles.modalSubtitle}>{t('selectHabitsPrompt')}</p>
                        <div style={styles.habitSelectionContainer}>
                            {habits.map(habit => (
                                <div key={habit.id} style={styles.habitSelectItem} onClick={() => setSelectedHabits(p => p.includes(habit.id) ? p.filter(id => id !== habit.id) : [...p, habit.id])}>
                                    {selectedHabits.includes(habit.id) ? <CheckCircle2 color="#3B82F6" size={20} /> : <Circle color="#9CA3AF" size={20} />}
                                    <p style={styles.habitSelectText}>{habit.name}</p>
                                </div>
                            ))}
                        </div>
                        <button style={styles.saveButton} onClick={handleSaveRoutine}><p style={styles.saveButtonText}>{t('save')}</p></button>
                    </div>
                </div>
            )}
        </div>
    );
};