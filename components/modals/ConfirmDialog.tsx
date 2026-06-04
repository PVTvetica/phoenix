import React from 'react';
import WindowFrame from '../layout/WindowFrame';

export interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info' | 'warning';
    icon?: string;
}

interface ConfirmDialogProps {
    isOpen: boolean;
    options: ConfirmDialogOptions;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, options, onConfirm, onCancel }) => {
    const {
        title,
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'info',
        icon
    } = options;

    const getColor = () => {
        switch (variant) {
            case 'danger': return 'red';
            case 'warning': return 'amber';
            case 'info':
            default: return 'sky';
        }
    };

    const getIcon = () => {
        if (icon) return icon;
        switch (variant) {
            case 'danger': return 'fa-solid fa-triangle-exclamation';
            case 'warning': return 'fa-solid fa-circle-exclamation';
            case 'info':
            default: return 'fa-solid fa-circle-info';
        }
    };

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            icon={getIcon()}
            color={getColor()}
            width="max-w-md"
            initialX={window.innerWidth / 2 - 200} // Approximate center if needed, though WindowFrame centers 
            initialY={window.innerHeight / 2 - 150}
        >
            <div className="flex flex-col p-6 space-y-6">
                <p className="text-slate-300 text-sm leading-relaxed">
                    {message}
                </p>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-sm border border-slate-700 hover:border-slate-600"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded border shadow-lg transition-all active:scale-95 flex items-center gap-2 ${variant === 'danger'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-red-900/20'
                            : variant === 'warning'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-amber-900/20'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20 shadow-sky-900/20'
                            }`}
                    >
                        {variant === 'danger' && <i className="fa-solid fa-check"></i>}
                        {confirmText}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default ConfirmDialog;
