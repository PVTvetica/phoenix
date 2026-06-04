
import React, { useState, useCallback, useMemo } from 'react';
import { ServiceType, UrgencyLevel, ThreatLevel, HydratedServiceRequest, ServiceRequestStatus } from '../../types';
import { urgencyLabel, threatLevelLabel, serviceTypeLabel } from '../views/operations/requests/requestStyles';
import { useRequests } from '../../contexts/RequestsContext';

import { useData } from '../../contexts/DataContext';
import { useConfig } from '../../contexts/ConfigContext';
import LocationInput from '../ui/LocationInput';
import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface CreateAdHocRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateAdHocRequestModal: React.FC<CreateAdHocRequestModalProps> = ({ isOpen, onClose }) => {
    const { createAdHocRequest } = useRequests();
    const { refreshRequests } = useData();
    const { serviceTypes } = useConfig();
    const { addToast } = useNotification();
    const { viewRequestDetails } = useNavigation();

    const activeServiceTypes = useMemo(() => serviceTypes.filter(t => t.isActive), [serviceTypes]);
    const [serviceType, setServiceType] = useState<ServiceType>(activeServiceTypes.length > 0 ? activeServiceTypes[0].name : 'Security');

    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [threatLevel, setThreatLevel] = useState<ThreatLevel>(ThreatLevel.None);
    const [urgency, setUrgency] = useState<UrgencyLevel>(UrgencyLevel.Medium);
    const [rsiHandle, setRsiHandle] = useState('');
    const [partyInfo, setPartyInfo] = useState('');
    const [partyHandles, setPartyHandles] = useState<string[]>([]);
    const [currentHandle, setCurrentHandle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddHandle = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        const trimmed = currentHandle.trim();
        if (trimmed && !partyHandles.includes(trimmed)) {
            setPartyHandles([...partyHandles, trimmed]);
            setCurrentHandle('');
        }
    };

    const handleRemoveHandle = (handle: string) => {
        setPartyHandles(partyHandles.filter(h => h !== handle));
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (rsiHandle.includes(',') || rsiHandle.trim().split(/\s+/).length > 1) {
            addToast("Validierungsfehler", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Trage hier nur den Handle des PRIMÄREN Kontakts ein. Weitere Gruppenmitglieder ins Feld „Zusätzliche Parteimitglieder“." });
            return;
        }

        if (description.trim() && location.trim() && rsiHandle.trim()) {
            setIsLoading(true);
            try {
                const newId = await createAdHocRequest({
                    serviceType,
                    location,
                    description,
                    urgency,
                    threatLevel,
                    partyInfo: partyInfo.trim() || undefined,
                    unregisteredClientRsiHandle: rsiHandle.trim(),
                    secondaryClientHandles: partyHandles
                });

                await refreshRequests();

                const dummyReq: HydratedServiceRequest = {
                    id: newId,
                    serviceType,
                    location,
                    description,
                    status: ServiceRequestStatus.Submitted,
                    urgency,
                    threatLevel,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    client: undefined,
                    clientId: undefined,
                    unregisteredClientRsiHandle: rsiHandle.trim(),
                    assignedMembers: [],
                    assignedMemberIds: [],
                    secondaryClientHandles: partyHandles,
                    statusHistory: [],
                    hydratedStatusHistory: [],
                    partyInfo: partyInfo.trim() || undefined,
                    rated: false,
                    clientRating: undefined,
                    clientFeedback: undefined
                };

                onClose();
                viewRequestDetails(dummyReq);

            } catch (err) {
                console.error("Failed to create ad-hoc request:", err);
                addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Erstellen der Eilmeldung ist ein Fehler aufgetreten. Bitte versuche es erneut." });
            } finally {
                setIsLoading(false);
            }
        }
    }, [createAdHocRequest, serviceType, location, description, urgency, threatLevel, rsiHandle, partyInfo, partyHandles, onClose, viewRequestDetails, refreshRequests, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Eilmeldung protokollieren"
            subtitle="Manueller Eingabemodus"
            icon="fa-solid fa-file-pen"
            color="amber"
            width="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Primärer Client-Handle</label>
                            <input
                                type="text"
                                value={rsiHandle}
                                onChange={(e) => setRsiHandle(e.target.value)}
                                placeholder="z. B. SquadLeader_1"
                                className={inputClass}
                                required
                                disabled={isLoading}
                            />
                            <p className="text-[9px] text-amber-500/80 mt-1 flex items-center font-bold">
                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>Nur Einzelgriff.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Servicetyp</label>
                            <select
                                value={serviceType}
                                onChange={(e) => setServiceType(e.target.value)}
                                className={inputClass}
                                disabled={isLoading}
                            >
                                {activeServiceTypes.map(t => (
                                    <option key={t.id} value={t.name}>{serviceTypeLabel(t.name)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Dringlichkeit</label>
                            <select
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                                className={inputClass}
                                disabled={isLoading}
                            >
                                {Object.values(UrgencyLevel).map(level => (
                                    <option key={level} value={level}>{urgencyLabel(level)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Bedrohungsstufe</label>
                            <select
                                value={threatLevel}
                                onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)}
                                className={inputClass}
                                disabled={isLoading}
                            >
                                {Object.values(ThreatLevel).map(level => (
                                    <option key={level} value={level}>{threatLevelLabel(level)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Standort</label>
                        <LocationInput
                            value={location}
                            onChange={setLocation}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Party Members Section */}
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                        <label className={labelClass}>Zusätzliche Parteimitglieder</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={currentHandle}
                                onChange={(e) => setCurrentHandle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddHandle(e); }}
                                placeholder="RSI-Handle (z. B. Wingman_Bob)"
                                className={inputClass}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={handleAddHandle}
                                disabled={!currentHandle.trim() || isLoading}
                                className="px-4 bg-slate-700 hover:bg-slate-600 text-amber-400 rounded-lg transition-colors border border-slate-600"
                            >
                                <i className="fa-solid fa-plus"></i>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {partyHandles.map(handle => (
                                <span key={handle} className="bg-slate-900 text-slate-300 px-2 py-1 rounded-sm text-xs border border-slate-700 flex items-center">
                                    {handle}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveHandle(handle)}
                                        className="ml-2 text-red-400 hover:text-red-300"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </span>
                            ))}
                            {partyHandles.length === 0 && <span className="text-xs text-slate-600 italic">Keine weiteren Mitglieder hinzugefügt.</span>}
                        </div>

                        <input
                            type="text"
                            value={partyInfo}
                            onChange={(e) => setPartyInfo(e.target.value)}
                            placeholder="Gruppenstatus / Kontext (z. B. alle verletzt)"
                            className={inputClass}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Beschreibung</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Lagebericht…"
                            className={`${inputClass} resize-none`}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Eilmeldung protokollieren'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default CreateAdHocRequestModal;
