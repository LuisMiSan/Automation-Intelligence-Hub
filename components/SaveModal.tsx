
import React, { useState } from 'react';
import { CloseIcon, FloppyIcon } from './icons';

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <FloppyIcon className="w-5 h-5 text-cyan-400" />
                        Guardar en Base de Datos
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Proyecto</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder-gray-600"
                            placeholder="Ej: Automatización Logística 2024"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name)}
                        />
                        <p className="text-xs text-gray-500 mt-2">Este nombre se usará para identificar la auditoría en el panel Admin.</p>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors border border-gray-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => onSave(name)}
                            disabled={!name.trim()}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-cyan-500/50"
                        >
                            Guardar Proyecto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
