
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Location, LocationType } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    location?: Location;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, location }) => {
    const { locations, addLocation, updateLocation } = useConfig();
    const { addToast } = useNotification();
    const [name, setName] = useState('');
    const [type, setType] = useState<LocationType>(LocationType.System);
    const [parentId, setParentId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = !!location;

    useEffect(() => {
        if (isOpen) {
            if (location) {
                setName(location.name);
                setType(location.type);
                setParentId(location.parent_id?.toString() || '');
            } else {
                setName('');
                setType(LocationType.System);
                setParentId('');
            }
            setIsLoading(false);
        }
    }, [isOpen, location]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (type !== LocationType.System && !parentId) {
            addToast("Validierungsfehler", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Für diesen Standorttyp musst du eine übergeordnete Einheit auswählen." });
            return;
        }

        setIsLoading(true);
        const locationData = {
            name: name.trim(),
            type,
            parent_id: parentId ? parseInt(parentId, 10) : null
        };

        try {
            if (isEditing && location) {
                await updateLocation({ id: location.id, ...locationData });
            } else {
                await addLocation(locationData);
            }
            onClose();
        } catch (err) {
            console.error("Failed to save location:", err);
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Speichern des Standorts ist ein Fehler aufgetreten. Bitte versuche es erneut." });
            setIsLoading(false);
        }
    }, [name, type, parentId, isEditing, location, addLocation, updateLocation, onClose, addToast]);

    const availableParents = useMemo(() => {
        // Filter potential parents based on the selected type to maintain hierarchy logic
        switch (type) {
            case LocationType.Planet:
                return locations.filter(l => l.type === LocationType.System);
            case LocationType.Moon:
                return locations.filter(l => l.type === LocationType.Planet);
            case LocationType.Station:
                return locations.filter(l => l.type === LocationType.System || l.type === LocationType.Planet);
            case LocationType.Facility:
                return locations.filter(l => l.type === LocationType.Planet || l.type === LocationType.Moon || l.type === LocationType.Station);
            case LocationType.System:
            default:
                return [];
        }
    }, [type, locations]);

    const handleTypeChange = (newType: LocationType) => {
        setType(newType);
        setParentId('');
    };

    if (!isOpen) return null;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Location' : 'Create Location'}
            subtitle="Kartographiedatenbank"
            icon="fa-solid fa-map-location-dot"
            color="sky"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* Body */}
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="locName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Standortname</label>
                        <input
                            type="text"
                            id="locName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Stanton or Grim HEX"
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="locType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Typ</label>
                            <select
                                id="locType"
                                value={type}
                                onChange={(e) => handleTypeChange(e.target.value as LocationType)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all"
                                disabled={isLoading}
                            >
                                {Object.values(LocationType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="locParent" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Übergeordneter Standort</label>
                            <select
                                id="locParent"
                                value={parentId}
                                onChange={(e) => setParentId(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all disabled:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading || type === LocationType.System}
                            >
                                <option value="">- Select Parent -</option>
                                {availableParents.map(parent => (
                                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-white/5 rounded-b-2xl shrink-0 gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : (isEditing ? 'Save Changes' : 'Create Location')}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default LocationModal;
