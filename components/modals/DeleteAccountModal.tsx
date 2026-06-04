import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
    const { deleteCurrentUser } = useAuth();
    const { addToast } = useNotification();
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const canDelete = confirmationText === 'DELETE';

    const handleDelete = async () => {
        if (!canDelete) return;
        setIsDeleting(true);
        try {
            await deleteCurrentUser();
            // On success, the app will log out, and this modal will unmount.
        } catch (err) {
            console.error(err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Konto konnte nicht gelöscht werden. Bitte versuche es erneut." });
            setIsDeleting(false);
        }
    }

    if (!isOpen) {
        return null;
    }

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Your Account"
            subtitle="Dauerhafte Aktion"
            icon="fa-solid fa-user-xmark"
            color="red"
            width="max-w-lg"
        >
            <div className="flex flex-col h-full bg-slate-900/50">
                <div className="p-6 space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        This action will anonymize your account and remove you from active rosters. Your service and reputation history will be retained. If you log in again in the future, your account will be reactivated with its history restored. This policy is in place to prevent abuse of the reputation system.
                    </p>
                    <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg">
                        <p className="text-slate-300 text-sm mb-3">Bitte eingeben<strong className="text-red-400 font-mono">DELETE</strong> to confirm.
                        </p>
                        <div>
                            <label htmlFor="delete-confirm" className="sr-only">Bestätige den Löschvorgang</label>
                            <input
                                id="delete-confirm"
                                type="text"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-600 rounded-md p-2.5 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden font-mono text-center tracking-widest uppercase"
                                autoComplete="off"
                                disabled={isDeleting}
                                placeholder="DELETE"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end p-5 bg-slate-900/80 border-t border-slate-700 rounded-b-xl gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">Abbrechen</button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!canDelete || isDeleting}
                        className="flex items-center justify-center min-w-[200px] px-6 py-2 text-sm font-bold uppercase tracking-wider text-white bg-red-600 rounded-md hover:bg-red-500 transition-all shadow-lg shadow-red-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {isDeleting ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Delete Account'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default DeleteAccountModal;