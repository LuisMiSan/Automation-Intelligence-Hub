
import React, { useRef, useState } from 'react';
import { 
    LayoutIcon, 
    AnalysisIcon, 
    FlowIcon, 
    StackIcon, 
    RocketIcon, 
    StatsIcon, 
    SearchIcon,
    SparklesIcon,
    HistoryIcon,
    UploadIcon,
    TrashIcon,
    DownloadIcon,
    CheckIcon
} from './icons';
import type { SavedPlan } from '../types';

interface AdminPanelProps {
    isOpen: boolean;
    onNavigate: (sectionId: any) => void;
    hasPlan: boolean;
    history: SavedPlan[];
    onLoadPlan: (plan: SavedPlan) => void;
    onNewAudit: () => void;
    onImportProject: (file: File) => void;
    onDeleteProject: (id: string) => void;
    currentProjectId: string | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
    isOpen, 
    onNavigate, 
    hasPlan, 
    history, 
    onLoadPlan, 
    onNewAudit,
    onImportProject,
    onDeleteProject,
    currentProjectId
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'db' | 'nav'>('db');
    const [searchTerm, setSearchTerm] = useState('');

    const navItems = [
        { id: 'input', label: 'Describe tu Negocio', icon: <LayoutIcon /> },
        { id: 'analysis', label: 'Análisis de Procesos', icon: <AnalysisIcon /> },
        { id: 'flows', label: 'Diseño de Flujos', icon: <FlowIcon /> },
        { id: 'stack', label: 'Stack Tecnológico', icon: <StackIcon /> },
        { id: 'implementation', label: 'Implementación', icon: <RocketIcon /> },
        { id: 'roi', label: 'ROI Estimado', icon: <StatsIcon /> },
        { id: 'sources', label: 'Fuentes de Datos', icon: <SearchIcon /> },
    ];

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        }).format(new Date(timestamp));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImportProject(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleDownload = (e: React.MouseEvent, plan: SavedPlan) => {
        e.stopPropagation();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plan));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${plan.name.replace(/\s+/g, '_')}_${plan.id}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const filteredHistory = history.filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            item.name.toLowerCase().includes(term) || 
            (item.businessDescription || '').toLowerCase().includes(term)
        );
    });

    return (
        <aside 
            className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out flex-shrink-0 z-20 overflow-hidden flex flex-col ${
                isOpen ? 'w-80' : 'w-0'
            }`}
        >
            <div className="w-80 flex flex-col h-full overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('db')}
                        className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative ${
                            activeTab === 'db' 
                            ? 'text-cyan-400 bg-cyan-900/10' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                    >
                        <HistoryIcon className="w-4 h-4" />
                        Base de Datos
                        {activeTab === 'db' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('nav')}
                        className={`flex-1 py-4 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative ${
                            activeTab === 'nav' 
                            ? 'text-cyan-400 bg-cyan-900/10' 
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                    >
                        <LayoutIcon className="w-4 h-4" />
                        Navegación
                         {activeTab === 'nav' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-5 relative">
                    
                    {/* --- TAB: BASE DE DATOS --- */}
                    {activeTab === 'db' && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
                             <div className="mb-5 space-y-3 flex-shrink-0">
                                <button
                                    onClick={onNewAudit}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20 border border-cyan-400/20"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Nueva Auditoría
                                </button>
                                
                                <div className="relative group">
                                    <input 
                                        type="text"
                                        placeholder="Buscar en la base de datos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all placeholder-gray-600 group-hover:bg-gray-800"
                                    />
                                    <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3 top-2.5 group-hover:text-cyan-500 transition-colors" />
                                </div>
                           </div>

                           <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    Proyectos ({filteredHistory.length})
                                </span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-gray-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-gray-800 transition-all flex items-center gap-1 text-[10px] font-medium"
                                        title="Importar JSON"
                                    >
                                        <UploadIcon className="w-3.5 h-3.5" />
                                        Importar
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept=".json" 
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`w-full p-3 rounded-xl border transition-all group relative cursor-pointer ${
                                                currentProjectId === item.id 
                                                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                                : 'bg-gray-800/30 border-gray-800 hover:border-gray-600 hover:bg-gray-800'
                                            }`}
                                            onClick={() => onLoadPlan(item)}
                                        >
                                            <div className="text-[10px] text-gray-500 mb-1.5 font-mono flex justify-between items-center">
                                                <span>{formatDate(item.timestamp)}</span>
                                                {currentProjectId === item.id && (
                                                    <span className="flex items-center gap-1 text-cyan-400 font-bold bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30 animate-pulse text-[9px]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                                        EDITANDO
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-sm font-semibold line-clamp-1 mb-1 ${
                                                currentProjectId === item.id ? 'text-cyan-100' : 'text-gray-200 group-hover:text-white'
                                            }`}>
                                                {item.name || "Sin nombre"}
                                            </div>
                                            <div className="text-[11px] text-gray-500 truncate pr-6 h-4">
                                                {item.businessDescription}
                                            </div>
                                            
                                            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/90 p-0.5 rounded-lg backdrop-blur-sm border border-gray-700 shadow-lg z-10">
                                                <button 
                                                    onClick={(e) => handleDownload(e, item)}
                                                    className="text-gray-400 hover:text-cyan-400 p-1.5 hover:bg-gray-700 rounded-md transition-colors"
                                                    title="Descargar Backup"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onDeleteProject(item.id); }}
                                                    className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Eliminar Proyecto"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-gray-800 rounded-xl bg-gray-800/10">
                                        <p className="text-gray-500 text-xs mb-2">No se encontraron proyectos</p>
                                        {searchTerm ? (
                                            <p className="text-gray-600 text-[10px]">Prueba con otra búsqueda</p>
                                        ) : (
                                            <p className="text-gray-600 text-[10px]">Crea tu primera auditoría</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: NAVEGACIÓN --- */}
                    {activeTab === 'nav' && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                             <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-1">Secciones del Plan</h2>
                             <nav className="space-y-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(item.id)}
                                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all group"
                                    >
                                        <span className="text-gray-600 group-hover:text-cyan-400 transition-colors bg-gray-800 group-hover:bg-cyan-900/20 p-1.5 rounded-md">
                                            {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4' })}
                                        </span>
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                            
                            {hasPlan && (
                                <div className="mt-auto pt-6 border-t border-gray-800">
                                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Estado Actual</div>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${hasPlan ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></div>
                                            <span className="text-xs font-semibold text-gray-300">{hasPlan ? (currentProjectId ? 'Proyecto Guardado' : 'Borrador sin guardar') : 'Esperando input'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};
