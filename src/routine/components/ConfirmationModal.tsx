import React from 'react';
import { styles } from '../styles';

interface ConfirmationModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    t: (key: string) => string;
}

// 커스텀 확인 모달 컴포넌트
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, message, onClose, onConfirm, t }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div style={styles.modalContainer}>
            <div style={styles.confirmModalContent}>
                <p style={styles.modalTitle}>{message}</p>
                <div style={styles.confirmButtonContainer}>
                    <button onClick={onClose} style={{...styles.confirmButton, ...styles.cancelButton}}>{t('cancel')}</button>
                    <button onClick={handleConfirm} style={{...styles.confirmButton, ...styles.okButton}}>{t('confirm')}</button>
                </div>
            </div>
        </div>
    );
};
