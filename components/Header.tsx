
import React from 'react';
import { BotIcon, SettingsIcon, FloppyIcon, DocumentArrowDownIcon } from './icons';

interface HeaderProps {
    onToggleAdmin: () => void;
    isAdminOpen: boolean;
    hasPlan: boolean;
    onSaveProject: () => void;
    onExportPDF: () => void;
    currentProjectId: string | null;
}

export const Header: React.FC<HeaderProps> = ({ 
    onToggleAdmin, 
    isAdminOpen, 
    hasPlan, 
    onSaveProject, 
    onExportPDF, 
    currentProjectId 
}) => {
    return (
        <header className="bg-gray-950 border-b border-gray-800 h-16 flex items-center px-4 md:px-8 justify-between sticky top-0 z-30 backdrop-blur-xl bg-opacity-90">
            <div className="flex items-center gap-3">
                <div className="bg-cyan-600/20 p-2 rounded-lg">
                    <BotIcon className="w-6 h-6 text-cyan-400" />
                </div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Automation Intelligence <span className="hidden sm:inline">Hub</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
                {hasPlan && (
                    <>
                        <button 
                            onClick={onSaveProject}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all border text-sm font-bold shadow-lg ${
                                currentProjectId 
                                ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-500/50' 
                                : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border-cyan-500/50'
                            }`}
                        >
                            <FloppyIcon className="w-4 h-4" />
                            <span className="hidden md:inline">{currentProjectId ? 'Actualizar' : 'Guardar'}</span>
                        </button>
                        <button 
                            onClick={onExportPDF}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all border border-gray-700 shadow-lg text-sm font-semibold"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 text-gray-400" />
                            <span className="hidden md:inline">PDF</span>
                        </button>
                        <div className="w-px h-6 bg-gray-800 mx-1"></div>
                    </>
                )}
                
                <button 
                    onClick={onToggleAdmin}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all border ${
                        isAdminOpen 
                        ? 'bg-cyan-600/10 border-cyan-500/50 text-cyan-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                    title="Panel de Administración"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};
