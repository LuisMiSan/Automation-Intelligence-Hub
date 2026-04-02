
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { BusinessInput } from './components/BusinessInput';
import { AutomationPlan } from './components/AutomationPlan';
import { AdminPanel } from './components/AdminPanel';
import { ChatBot } from './components/ChatBot';
import { SaveModal } from './components/SaveModal';
import { generateAutomationPlan } from './services/geminiService';
import type { Plan, GroundingSource, SavedPlan, PlanSection } from './types';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'automation_hub_database_v2';

const App: React.FC = () => {
    const [automationPlan, setAutomationPlan] = useState<Plan | null>(null);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState<boolean>(true);
    const [history, setHistory] = useState<SavedPlan[]>([]);
    const [currentDescription, setCurrentDescription] = useState<string>('');
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    
    // UI States
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const sectionsRefs = {
        input: useRef<HTMLDivElement>(null),
        analysis: useRef<HTMLDivElement>(null),
        flows: useRef<HTMLDivElement>(null),
        stack: useRef<HTMLDivElement>(null),
        implementation: useRef<HTMLDivElement>(null),
        roi: useRef<HTMLDivElement>(null),
        sources: useRef<HTMLDivElement>(null),
    };

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading database", e);
            }
        }
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
    };

    const saveToStorage = (newHistory: SavedPlan[]) => {
        try {
            setHistory(newHistory);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        } catch (e) {
            console.error("Error saving to localStorage", e);
            showNotification("Error: Almacenamiento lleno", 'error');
        }
    };

    const scrollToSection = (sectionId: keyof typeof sectionsRefs) => {
        sectionsRefs[sectionId].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleNewAudit = () => {
        setAutomationPlan(null);
        setGroundingSources([]);
        setCurrentDescription('');
        setCurrentProjectId(null);
        scrollToSection('input');
    };

    const loadFromHistory = (savedPlan: SavedPlan) => {
        setAutomationPlan(savedPlan.plan);
        setGroundingSources(savedPlan.sources);
        setCurrentDescription(savedPlan.businessDescription);
        setCurrentProjectId(savedPlan.id);
        setTimeout(() => scrollToSection('analysis'), 100);
    };

    const handleDeleteProject = (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto de la base de datos?')) {
            const updatedHistory = history.filter(item => item.id !== id);
            saveToStorage(updatedHistory);
            if (currentProjectId === id) {
                handleNewAudit();
            }
            showNotification("Proyecto eliminado");
        }
    };

    const handleSaveButtonClick = () => {
        if (!automationPlan) return;
        if (currentProjectId) {
            updateExistingProject();
        } else {
            setIsSaveModalOpen(true);
        }
    };

    const updateExistingProject = () => {
        if (!currentProjectId || !automationPlan) return;

        const updatedHistory = history.map(p => {
            if (p.id === currentProjectId) {
                return {
                    ...p,
                    timestamp: Date.now(),
                    businessDescription: currentDescription,
                    plan: automationPlan,
                    sources: groundingSources
                };
            }
            return p;
        });
        saveToStorage(updatedHistory);
        showNotification("Proyecto actualizado correctamente");
    };

    const handleSaveNewProject = (name: string) => {
        if (!automationPlan) return;

        const newId = Date.now().toString();
        const savedItem: SavedPlan = {
            id: newId,
            name: name,
            timestamp: Date.now(),
            businessDescription: currentDescription,
            plan: automationPlan,
            sources: groundingSources
        };

        const updatedHistory = [savedItem, ...history];
        saveToStorage(updatedHistory);
        setCurrentProjectId(newId);
        setIsSaveModalOpen(false);
        showNotification("Nuevo proyecto guardado en Base de Datos");
    };

    const handleUpdatePlanSection = (sectionKey: keyof Plan, newContent: string) => {
        if (!automationPlan) return;
        setAutomationPlan({
            ...automationPlan,
            [sectionKey]: {
                ...automationPlan[sectionKey],
                content: newContent
            }
        });
    };

    const handleExportPDF = () => {
        if (!automationPlan) return;
        const doc = new jsPDF();
        let y = 20;
        const leftMargin = 20;
        const pageWidth = doc.internal.pageSize.width;
        const maxLineWidth = pageWidth - (leftMargin * 2);

        doc.setFontSize(22);
        doc.text("Plan de Automatización", leftMargin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado para: ${currentDescription.substring(0, 50)}...`, leftMargin, y);
        y += 15;

        const sections = [automationPlan.analysis, automationPlan.flows, automationPlan.stack, automationPlan.implementation, automationPlan.roi];
        sections.forEach(section => {
            if (!section.title || !section.content) return;
            doc.setFontSize(16);
            doc.setTextColor(0, 100, 160);
            doc.text(section.title, leftMargin, y);
            y += 10;
            doc.setFontSize(11);
            doc.setTextColor(20, 20, 20);
            const lines = doc.splitTextToSize(section.content, maxLineWidth);
            lines.forEach((line: string) => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(line, leftMargin, y);
                y += 6;
            });
            y += 10;
        });

        doc.save("plan_automatizacion.pdf");
    };

    const handleImportProject = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedPlan = JSON.parse(content) as SavedPlan;
                
                if (!importedPlan.plan || !importedPlan.id) {
                    throw new Error("Formato de archivo inválido");
                }

                importedPlan.id = Date.now().toString() + Math.random().toString().slice(2, 5);
                importedPlan.name = importedPlan.name + " (Importado)";

                const updatedHistory = [importedPlan, ...history];
                saveToStorage(updatedHistory);
                loadFromHistory(importedPlan);
                showNotification("Proyecto importado correctamente");
            } catch (err) {
                console.error("Error importing file:", err);
                showNotification("Error al importar el archivo", 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleGeneratePlan = useCallback(async (businessDescription: string) => {
        if (!businessDescription.trim()) {
            setError("Por favor, describe tu negocio.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAutomationPlan(null);
        setGroundingSources([]);
        setCurrentDescription(businessDescription);

        try {
            const result = await generateAutomationPlan(businessDescription);
            const { planData, sources } = result;

            const newPlan: Plan = {
                analysis: { title: '1. Análisis de Procesos Manuales', content: planData.analysis || '' },
                flows: { title: '2. Diseño de Flujos de Agentes', content: planData.flows || '' },
                stack: { title: '3. Stack Tecnológico Recomendado', content: planData.stack || '' },
                implementation: { title: '4. Implementación Paso a Paso', content: planData.implementation || '' },
                roi: { title: '5. ROI Estimado', content: planData.roi || '' },
            };

            setAutomationPlan(newPlan);
            setGroundingSources(sources);
            
        } catch (err) {
            console.error("Error generating plan:", err);
            setError("Hubo un error al generar el plan. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="h-screen bg-gray-950 text-gray-100 font-sans flex flex-col overflow-hidden">
            <Header 
                onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)} 
                isAdminOpen={isAdminOpen} 
                hasPlan={!!automationPlan}
                onSaveProject={handleSaveButtonClick}
                onExportPDF={handleExportPDF}
                currentProjectId={currentProjectId}
            />
            
            {/* Notifications */}
            <div className={`fixed top-20 right-1/2 translate-x-1/2 z-50 transition-all duration-300 transform ${notification ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                {notification && (
                    <div className={`px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
                        notification.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-semibold text-sm">{notification.message}</span>
                    </div>
                )}
            </div>

            <SaveModal 
                isOpen={isSaveModalOpen} 
                onClose={() => setIsSaveModalOpen(false)} 
                onSave={handleSaveNewProject} 
            />
            
            <div className="flex flex-1 overflow-hidden relative">
                <AdminPanel 
                    isOpen={isAdminOpen} 
                    onNavigate={scrollToSection} 
                    hasPlan={!!automationPlan}
                    history={history}
                    onLoadPlan={loadFromHistory}
                    onNewAudit={handleNewAudit}
                    onImportProject={handleImportProject}
                    onDeleteProject={handleDeleteProject}
                    currentProjectId={currentProjectId}
                />
                
                <main className="flex-1 overflow-y-auto bg-gray-900/30 pb-32 custom-scrollbar relative">
                    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                        <div ref={sectionsRefs.input}>
                            <BusinessInput 
                                onGenerate={handleGeneratePlan} 
                                isLoading={isLoading} 
                                initialValue={currentDescription}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/30 border border-red-800 text-red-200 px-6 py-4 rounded-xl text-center backdrop-blur-md">
                                {error}
                            </div>
                        )}
                    </div>

                    <AutomationPlan 
                        plan={automationPlan}
                        sources={groundingSources}
                        isLoading={isLoading}
                        refs={sectionsRefs}
                        onUpdateSection={handleUpdatePlanSection}
                        businessDescription={currentDescription}
                    />
                </main>
            </div>
            
            <ChatBot />
        </div>
    );
};

export default App;
