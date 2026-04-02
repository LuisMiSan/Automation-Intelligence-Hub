
import React, { useState } from 'react';
import type { Plan, GroundingSource } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { 
    AnalysisIcon, 
    FlowIcon, 
    StackIcon, 
    RocketIcon, 
    StatsIcon, 
    SearchIcon,
    PencilIcon,
    CheckIcon,
    LayoutIcon
} from './icons';

interface AutomationPlanProps {
    plan: Plan | null;
    sources: GroundingSource[];
    isLoading: boolean;
    refs: any;
    onUpdateSection: (sectionKey: keyof Plan, newContent: string) => void;
    businessDescription: string;
}

const Card: React.FC<{ 
    title: string; 
    content: string; 
    icon: React.ReactNode; 
    isLoading: boolean;
    idRef?: React.RefObject<HTMLDivElement | null>;
    onSaveContent?: (newContent: string) => void;
    readOnly?: boolean;
    variant?: 'default' | 'highlight';
}> = ({ title, content, icon, isLoading, idRef, onSaveContent, readOnly = false, variant = 'default' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(content);

    React.useEffect(() => {
        setEditedContent(content);
    }, [content]);

    const handleSave = () => {
        if (onSaveContent) {
            onSaveContent(editedContent);
        }
        setIsEditing(false);
    };

    const isHighlight = variant === 'highlight';

    return (
        <div ref={idRef} className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-sm group transition-colors ${
            isHighlight 
            ? 'bg-blue-900/10 border-blue-800/50 hover:border-blue-700/50' 
            : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
        }`}>
            <div className={`border-b px-6 py-4 flex items-center justify-between ${
                isHighlight ? 'border-blue-800/30 bg-blue-900/20' : 'border-gray-800 bg-gray-800/20'
            }`}>
                <h3 className={`text-lg font-bold flex items-center gap-3 ${isHighlight ? 'text-blue-200' : 'text-white'}`}>
                    <span className={`p-2 rounded-lg ${isHighlight ? 'text-blue-400 bg-blue-400/10' : 'text-cyan-500 bg-cyan-500/10'}`}>
                        {icon}
                    </span>
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    {isLoading && <LoadingSpinner />}
                    {!isLoading && content && !readOnly && onSaveContent && (
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className={`p-2 rounded-lg transition-all ${
                                isEditing 
                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                            title={isEditing ? "Guardar cambios" : "Remodelar / Editar"}
                        >
                            {isEditing ? <CheckIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
            <div className="p-8">
                {isLoading && !content ? (
                     <div className="py-12 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-sm italic">Pendiente de generación...</p>
                    </div>
                ) : isEditing ? (
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-96 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-300 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-cyan-500/30 outline-none resize-y"
                    />
                ) : content ? (
                    <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-p:leading-relaxed prose-li:text-gray-400 prose-strong:text-cyan-400">
                        {content.split('\n').map((paragraph, index) => {
                            if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                                return <li key={index} className="mb-2 list-none flex gap-2">
                                    <span className="text-cyan-600">•</span> {paragraph.substring(2)}
                                </li>;
                            }
                            if (/^\d+\./.test(paragraph)) {
                                 return <li key={index} className="mb-2 list-none flex gap-2">
                                    <span className="font-bold text-cyan-600">{paragraph.split('.')[0]}.</span> {paragraph.substring(paragraph.indexOf('.')+1)}
                                </li>;
                            }
                            return paragraph.trim() ? <p key={index} className="mb-4">{paragraph}</p> : null;
                        })}
                    </div>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                        <p className="text-sm italic">Esperando datos...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AutomationPlan: React.FC<AutomationPlanProps> = ({ 
    plan, 
    sources, 
    isLoading, 
    refs, 
    onUpdateSection,
    businessDescription
}) => {
    return (
        <div className="flex flex-col">
            <div className="p-4 md:p-8 space-y-12 max-w-7xl mx-auto w-full">
                {/* Context Card (Always Visible if description exists) */}
                {(businessDescription && (plan || isLoading)) && (
                     <Card 
                        title="Contexto del Negocio" 
                        content={businessDescription} 
                        icon={<LayoutIcon />} 
                        isLoading={false}
                        readOnly={true}
                        variant="highlight"
                    />
                )}

                <Card 
                    idRef={refs.analysis}
                    title="1. Análisis de Procesos Manuales" 
                    content={plan?.analysis.content || ''} 
                    icon={<AnalysisIcon />} 
                    isLoading={isLoading && !plan}
                    onSaveContent={(c) => onUpdateSection('analysis', c)}
                />
                
                <Card 
                    idRef={refs.flows}
                    title="2. Diseño de Flujos de Agentes" 
                    content={plan?.flows.content || ''} 
                    icon={<FlowIcon />} 
                    isLoading={isLoading && !plan}
                    onSaveContent={(c) => onUpdateSection('flows', c)}
                />

                <Card 
                    idRef={refs.stack}
                    title="3. Stack Tecnológico Recomendado" 
                    content={plan?.stack.content || ''} 
                    icon={<StackIcon />} 
                    isLoading={isLoading && !plan}
                    onSaveContent={(c) => onUpdateSection('stack', c)}
                />

                <Card 
                    idRef={refs.implementation}
                    title="4. Implementación Paso a Paso" 
                    content={plan?.implementation.content || ''} 
                    icon={<RocketIcon />} 
                    isLoading={isLoading && !plan}
                    onSaveContent={(c) => onUpdateSection('implementation', c)}
                />

                <Card 
                    idRef={refs.roi}
                    title="5. ROI Estimado" 
                    content={plan?.roi.content || ''} 
                    icon={<StatsIcon />} 
                    isLoading={isLoading && !plan}
                    onSaveContent={(c) => onUpdateSection('roi', c)}
                />

                <div ref={refs.sources} className="bg-gray-800/40 rounded-2xl border border-gray-800 shadow-xl overflow-hidden backdrop-blur-sm">
                    <div className="border-b border-gray-800 px-6 py-4 bg-gray-800/20">
                        <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                            <span className="text-cyan-500 bg-cyan-500/10 p-2 rounded-lg"><SearchIcon /></span>
                            Fuentes de Información
                        </h3>
                    </div>
                    <div className="p-8">
                        {sources.length > 0 ? (
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sources.map((source, index) => (
                                    <li key={index} className="flex">
                                        <a 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex-1 p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-cyan-500/50 hover:bg-gray-800 transition-all group"
                                        >
                                            <p className="text-cyan-400 font-medium text-sm mb-1 group-hover:underline truncate">{source.title}</p>
                                            <p className="text-gray-500 text-xs truncate">{source.uri}</p>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                                <p className="text-sm italic">Esperando búsqueda externa...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
