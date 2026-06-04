import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import { useMembers } from '../../contexts/MembersContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface AwardSingleCertificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const AwardSingleCertificationModal: React.FC<AwardSingleCertificationModalProps> = ({ isOpen, onClose, user }) => {
    const { certifications, awardCertification } = useMembers();
    const { addToast } = useNotification();
    const [selectedCertId, setSelectedCertId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const availableCerts = useMemo(() => {
        const awardedIds = new Set(user.certifications?.map(c => c.id));
        return certifications.filter(cert => !awardedIds.has(cert.id));
    }, [certifications, user.certifications]);

    const handleSave = async () => {
        if (!selectedCertId) return;
        setIsLoading(true);
        try {
            await awardCertification(user.id, parseInt(selectedCertId));
            onClose();
        } catch (err) {
            console.error("Failed to award certification:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Verleihen der Zertifizierung ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={`Award Certification: ${user.name}`}
            subtitle="Personalakte"
            icon="fa-solid fa-certificate"
            color="green"
            width="max-w-lg"
        >
            <div className="flex flex-col h-full">
                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="certification" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Wähle Zertifizierung aus</label>
                        <select
                            id="certification"
                            value={selectedCertId}
                            onChange={(e) => setSelectedCertId(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-hidden transition-all"
                            disabled={isLoading}
                        >
                            <option value="">- Choose a certification -</option>
                            {availableCerts.map(cert => (
                                <option key={cert.id} value={cert.id}>{cert.name}</option>
                            ))}
                        </select>
                        {availableCerts.length === 0 && (
                            <p className="text-xs text-slate-500 mt-2 italic bg-slate-900/50 p-2 rounded-sm border border-slate-800 text-center">This member has already been awarded all available certifications.</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 bg-slate-900/50 border-t border-white/5 rounded-b-xl gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="w-32 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-600 rounded-lg hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
                        disabled={isLoading || !selectedCertId}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Award'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default AwardSingleCertificationModal;