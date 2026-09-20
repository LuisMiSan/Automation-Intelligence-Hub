
import React from 'react';
import { InfinityIcon, SettingsIcon, FloppyIcon, DocumentArrowDownIcon, UserIcon } from './icons';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

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
    const [user] = useAuthState(auth);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <header className="bg-gray-950 border-b border-gray-800 h-16 flex items-center px-4 md:px-8 justify-between sticky top-0 z-30 backdrop-blur-xl bg-opacity-90">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-1.5 rounded-lg border border-blue-500/30">
                    <InfinityIcon className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex flex-col -space-y-1">
                    <h1 className="text-lg md:text-xl font-black tracking-tighter flex items-baseline">
                        <span className="text-white">IA</span>
                        <span className="text-blue-500 ml-1">DIVISION</span>
                    </h1>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-none">
                        Artificial Intelligence
                    </span>
                </div>
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

                <div className="w-px h-6 bg-gray-800 mx-1"></div>

                {user ? (
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all border border-gray-700 shadow-lg group relative"
                        title={`Cerrar sesión (${user.email})`}
                    >
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || ''} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-7 h-7 bg-cyan-600 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="absolute top-full right-0 mt-2 hidden group-hover:block bg-gray-900 text-[10px] px-2 py-1 rounded border border-gray-800 whitespace-nowrap z-50">
                            {user.email} (Salir)
                        </span>
                    </button>
                ) : (
                    <button 
                        onClick={handleLogin}
                        className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all shadow-lg text-xs font-bold"
                    >
                        <UserIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin Login</span>
                    </button>
                )}
            </div>
        </header>
    );
};
