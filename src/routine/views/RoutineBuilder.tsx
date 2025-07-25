import React, { useState, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { Edit3, Trash2, X, CheckCircle2, Circle, ArrowUpCircle, ArrowDownCircle, PlusSquare } from 'lucide-react';
import { db, appId } from '../firebase';
import type { Habit, Routine, RoutineGroup } from '../types';

interface RoutineBuilderProps {
    habits: Habit[];
    routines: Routine[];
    routineGroups: RoutineGroup[];
    userId: string;
    setConfirmModal: (modal: { isOpen: boolean; message: string; onConfirm: () => void; }) => void;
    setNotification: (message: string) => void;
    t: (key: string) => string;
    styles: { [key: string]: React.CSSProperties };
}

export const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ habits, routines, routineGroups, userId, setConfirmModal, setNotification, t, styles }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
    const [newRoutineName, setNewRoutineName] = useState('');
    const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [editingGroup, setEditingGroup] = useState<RoutineGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState('');

    const habitsMap = useMemo(() => new Map(habits.map(h => [h.id, h])), [habits]);
    const sortedRoutineGroups = useMemo(() => [...routineGroups].sort((a, b) => a.order - b.order), [routineGroups]);

    const routinesByGroup = useMemo(() => {
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

        return { groupMap, ungrouped };
    }, [routines]);

    const closeModal = () => {
        setModalVisible(false);
        setEditingRoutine(null);
        setNewRoutineName('');
        setSelectedHabits([]);
        setSelectedGroupId(null);
    };

    const closeGroupModal = () => {
        setGroupModalVisible(false);
        setEditingGroup(null);
        setNewGroupName('');
    };

    const handleEditRoutine = (routine: Routine) => {
        setEditingRoutine(routine);
        setNewRoutineName(routine.name);
        setSelectedHabits(routine.habitIds);
        setSelectedGroupId(routine.groupId || null);
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
            groupId: selectedGroupId,
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

    const handleEditGroup = (group: RoutineGroup) => {
        setEditingGroup(group);
        setNewGroupName(group.name);
        setGroupModalVisible(true);
    };

    const handleDeleteGroup = (groupId: string) => {
        setConfirmModal({
            isOpen: true,
            message: t('deleteGroupConfirm'),
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    const groupDocRef = doc(db, `artifacts/${appId}/users/${userId}/routine_groups`, groupId);
                    batch.delete(groupDocRef);

                    routines.forEach(routine => {
                        if (routine.groupId === groupId) {
                            const routineDocRef = doc(db, `artifacts/${appId}/users/${userId}/routines`, routine.id);
                            batch.update(routineDocRef, { groupId: null });
                        }
                    });

                    await batch.commit();
                    setNotification(t('groupDeleted'));
                } catch (error) {
                    console.error("그룹 삭제 오류:", error);
                    setNotification(t('groupDeleteError'));
                }
            }
        });
    };

    const handleSaveGroup = async () => {
        if (newGroupName.trim() === '') {
            setNotification(t('groupValidationError'));
            return;
        }

        const groupData = {
            name: newGroupName.trim(),
            userId: userId,
        };

        try {
            if (editingGroup) {
                const groupDocRef = doc(db, `artifacts/${appId}/users/${userId}/routine_groups`, editingGroup.id);
                await updateDoc(groupDocRef, { name: groupData.name });
                setNotification(t('updateGroupSuccess'));
            } else {
                const newOrder = routineGroups.length > 0 ? Math.max(...routineGroups.map(g => g.order)) + 1 : 0;
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/routine_groups`), { ...groupData, createdAt: serverTimestamp(), order: newOrder });
                setNotification(t('saveGroupSuccess'));
            }
            closeGroupModal();
        } catch (error) {
            console.error("그룹 저장 오류:", error);
            setNotification(t('saveRoutineError'));
        }
    };

    const handleMoveRoutine = async (routineToMove: Routine, direction: 'up' | 'down') => {
        const list = routineToMove.groupId ? routinesByGroup.groupMap[routineToMove.groupId] : routinesByGroup.ungrouped;
        const currentIndex = list.findIndex(r => r.id === routineToMove.id);

        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === list.length - 1)
        ) {
            return;
        }

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const otherRoutine = list[targetIndex];

        const batch = writeBatch(db);
        const routineToMoveRef = doc(db, `artifacts/${appId}/users/${userId}/routines`, routineToMove.id);
        const otherRoutineRef = doc(db, `artifacts/${appId}/users/${userId}/routines`, otherRoutine.id);

        batch.update(routineToMoveRef, { order: otherRoutine.order });
        batch.update(otherRoutineRef, { order: routineToMove.order });

        try {
            await batch.commit();
        } catch (error) {
            console.error("루틴 순서 업데이트 오류:", error);
            setNotification("루틴 순서 변경에 실패했습니다.");
        }
    };

    const handleMoveGroup = async (groupToMove: RoutineGroup, direction: 'up' | 'down') => {
        const currentIndex = sortedRoutineGroups.findIndex(g => g.id === groupToMove.id);

        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === sortedRoutineGroups.length - 1)
        ) {
            return;
        }

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const otherGroup = sortedRoutineGroups[targetIndex];

        const batch = writeBatch(db);
        const groupToMoveRef = doc(db, `artifacts/${appId}/users/${userId}/routine_groups`, groupToMove.id);
        const otherGroupRef = doc(db, `artifacts/${appId}/users/${userId}/routine_groups`, otherGroup.id);

        batch.update(groupToMoveRef, { order: otherGroup.order });
        batch.update(otherGroupRef, { order: groupToMove.order });

        try {
            await batch.commit();
        } catch (error) {
            console.error("그룹 순서 업데이트 오류:", error);
            setNotification("그룹 순서 변경에 실패했습니다.");
        }
    };

    const renderRoutineItem = (routine: Routine, index: number, total: number) => (
        <div key={routine.id} style={styles.card}>
            <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>{routine.name}</p>
                <div>
                    <button 
                        onClick={() => handleMoveRoutine(routine, 'up')} 
                        style={styles.transparentButton} 
                        disabled={index === 0}
                    >
                        <ArrowUpCircle size={18} color={index === 0 ? styles.disabled : styles.text} />
                    </button>
                    <button 
                        onClick={() => handleMoveRoutine(routine, 'down')} 
                        style={styles.transparentButton} 
                        disabled={index === total - 1}
                    >
                        <ArrowDownCircle size={18} color={index === total - 1 ? styles.disabled : styles.text} />
                    </button>
                    <button onClick={() => handleEditRoutine(routine)} style={{...styles.transparentButton, marginLeft: '8px'}}><Edit3 size={18} color={styles.text} /></button>
                    <button onClick={() => handleDeleteRoutine(routine.id)} style={styles.transparentButton}><Trash2 size={18} color="#EF4444" /></button>
                </div>
            </div>
            {routine.habitIds.map((habitId, idx) => {
                const habit = habitsMap.get(habitId);
                return <div key={habitId} style={styles.routineHabitItem}><p style={styles.routineHabitText}>{idx + 1}. {habit ? habit.name : 'Unknown Habit'}</p></div>;
            })}
        </div>
    );

    return (
        <div style={styles.viewContainer}>
            <p style={styles.viewTitle}>{t('routinesTitle')}</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button style={{...styles.bigAddButton, flex: 1, margin: 0}} onClick={() => { setEditingRoutine(null); setModalVisible(true); }}><p style={styles.bigAddButtonText}>{t('newRoutine')}</p></button>
                <button style={{...styles.bigAddButton, flex: 1, margin: 0, backgroundColor: styles.groupColor?.color}} onClick={() => { setEditingGroup(null); setGroupModalVisible(true); }}><p style={styles.bigAddButtonText}><PlusSquare size={16} style={{marginRight: '8px'}}/>New Group</p></button>
            </div>
            
            <div>
                {sortedRoutineGroups.map((group, index) => (
                    <div key={group.id} style={{...styles.card, border: `2px solid ${styles.groupBorder}`}}>
                        <div style={styles.cardHeader}>
                            <p style={{...styles.cardTitle, color: styles.groupColor}}>{group.name}</p>
                            <div>
                                <button 
                                    onClick={() => handleMoveGroup(group, 'up')} 
                                    style={styles.transparentButton} 
                                    disabled={index === 0}
                                >
                                    <ArrowUpCircle size={18} color={index === 0 ? styles.disabled : styles.text} />
                                </button>
                                <button 
                                    onClick={() => handleMoveGroup(group, 'down')} 
                                    style={styles.transparentButton} 
                                    disabled={index === sortedRoutineGroups.length - 1}
                                >
                                    <ArrowDownCircle size={18} color={index === sortedRoutineGroups.length - 1 ? styles.disabled : styles.text} />
                                </button>
                                <button onClick={() => handleEditGroup(group)} style={{...styles.transparentButton, marginLeft: '8px'}}><Edit3 size={18} color={styles.text} /></button>
                                <button onClick={() => handleDeleteGroup(group.id)} style={styles.transparentButton}><Trash2 size={18} color="#EF4444" /></button>
                            </div>
                        </div>
                        {(routinesByGroup.groupMap[group.id] || []).map((routine, idx) => renderRoutineItem(routine, idx, routinesByGroup.groupMap[group.id].length))}
                    </div>
                ))}
                <h3 style={{...styles.cardTitle, color: styles.subtext, marginTop: '20px'}}>Ungrouped</h3>
                {(routinesByGroup.ungrouped || []).map((routine, idx) => renderRoutineItem(routine, idx, routinesByGroup.ungrouped.length))}
            </div>

            {modalVisible && (
                <div style={styles.modalContainer}>
                    <div style={styles.modalContent}>
                        <button style={styles.closeButton} onClick={closeModal}><X color={styles.text} size={24} /></button>
                        <p style={styles.modalTitle}>{editingRoutine ? t('modalEditRoutineTitle') : t('modalNewRoutineTitle')}</p>
                        <input style={styles.input} placeholder={t('routineNamePlaceholder')} value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} />
                        
                        <p style={styles.modalSubtitle}>Group</p>
                        <select 
                            style={styles.input}
                            value={selectedGroupId || ''}
                            onChange={(e) => setSelectedGroupId(e.target.value || null)}
                        >
                            <option value="">No Group</option>
                            {sortedRoutineGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>

                        <p style={styles.modalSubtitle}>{t('selectHabitsPrompt')}</p>
                        <div style={styles.habitSelectionContainer}>
                            {habits.map(habit => (
                                <div key={habit.id} style={styles.habitSelectItem} onClick={() => setSelectedHabits(p => p.includes(habit.id) ? p.filter(id => id !== habit.id) : [...p, habit.id])}>
                                    {selectedHabits.includes(habit.id) ? <CheckCircle2 color={styles.primary} size={20} /> : <Circle color={styles.subtext} size={20} />}
                                    <p style={styles.habitSelectText}>{habit.name}</p>
                                </div>
                            ))}
                        </div>
                        <button style={styles.saveButton} onClick={handleSaveRoutine}><p style={styles.saveButtonText}>{t('save')}</p></button>
                    </div>
                </div>
            )}

            {groupModalVisible && (
                <div style={styles.modalContainer}>
                    <div style={styles.modalContent}>
                        <button style={styles.closeButton} onClick={closeGroupModal}><X color={styles.text} size={24} /></button>
                        <p style={styles.modalTitle}>{editingGroup ? 'Edit Group' : 'New Group'}</p>
                        <input style={styles.input} placeholder="Group Name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                        <button style={{...styles.saveButton, background: '#10B981'}} onClick={handleSaveGroup}><p style={styles.saveButtonText}>{t('save')}</p></button>
                    </div>
                </div>
            )}
        </div>
    );
};