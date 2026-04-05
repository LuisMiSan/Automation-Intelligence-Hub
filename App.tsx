
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { BusinessInput } from './components/BusinessInput';
import { AutomationPlan } from './components/AutomationPlan';
import { AdminPanel } from './components/AdminPanel';
import { ChatBot } from './components/ChatBot';
import { SaveModal } from './components/SaveModal';
import { generateAutomationPlan } from './services/geminiService';
import type { Plan, GroundingSource, SavedPlan, PlanSection, Lead, LeadStatus } from './types';
import { jsPDF } from 'jspdf';
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthState } from 'react-firebase-hooks/auth';

const STORAGE_KEY = 'automation_hub_database_v2';

const App: React.FC = () => {
    const [user] = useAuthState(auth);
    const [automationPlan, setAutomationPlan] = useState<Plan | null>(null);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState<boolean>(true);
    const [history, setHistory] = useState<SavedPlan[]>([]);
    const [currentDescription, setCurrentDescription] = useState<string>('');
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'audit' | 'timeline' | 'history' | 'leads'>('audit');
    const [leads, setLeads] = useState<Lead[]>([]);
    
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
        skills: useRef<HTMLDivElement>(null),
        json: useRef<HTMLDivElement>(null),
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

    useEffect(() => {
        if (user && user.email === 'luismigsm@gmail.com') {
            fetchLeads();
        } else {
            setLeads([]);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'leads' && user && user.email === 'luismigsm@gmail.com') {
            fetchLeads();
        }
    }, [activeTab, user]);

    const fetchLeads = async () => {
        if (!user || user.email !== 'luismigsm@gmail.com') return;
        try {
            const q = query(collection(db, 'leads'), orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const leadsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Lead[];
            setLeads(leadsData);
        } catch (err) {
            handleFirestoreError(err, OperationType.LIST, 'leads');
        }
    };

    const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        try {
            await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            showNotification("Estado del lead actualizado");
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
        }
    };

    const handleUpdateLeadNotes = async (leadId: string, notes: string) => {
        try {
            await updateDoc(doc(db, 'leads', leadId), { notes });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes } : l));
            showNotification("Notas actualizadas");
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
        }
    };

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
        setActiveTab('audit');
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
        setActiveTab('history');
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

    const handleExportPDF = (planToExport?: Plan, description?: string) => {
        const targetPlan = planToExport || automationPlan;
        const targetDescription = description || currentDescription;
        if (!targetPlan) return;
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const leftMargin = 25;
        const maxLineWidth = pageWidth - (leftMargin * 2);

        // --- COVER PAGE ---
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Decorative accent
        doc.setFillColor(59, 130, 246); // Blue-500
        doc.rect(0, 0, 10, pageHeight, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.text("IA DIVISION", leftMargin, 80);
        doc.setFontSize(24);
        doc.text("Plan de Transformación", leftMargin, 95);
        doc.text("con Inteligencia Artificial", leftMargin, 108);
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text("Estrategia personalizada para tu negocio", leftMargin, 122);

        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(1);
        doc.line(leftMargin, 135, leftMargin + 100, 135);

        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, leftMargin, 155);
        doc.text("Preparado por: IA DIVISION - Artificial Intelligence", leftMargin, 165);

        doc.addPage();
        // --- END COVER PAGE ---

        let y = 30;
        
        // Introduction Section
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Resumen del Proyecto", leftMargin, y);
        y += 12;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105); // Slate-600
        const introText = "Este documento detalla cómo la Inteligencia Artificial puede simplificar tus procesos diarios, permitiéndote enfocarte en lo que realmente importa: hacer crecer tu negocio.";
        const introLines = doc.splitTextToSize(introText, maxLineWidth);
        doc.text(introLines, leftMargin, y);
        y += (introLines.length * 6) + 10;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Tu Negocio Hoy:", leftMargin, y);
        y += 7;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        const descLines = doc.splitTextToSize(targetDescription, maxLineWidth);
        doc.text(descLines, leftMargin, y);
        y += (descLines.length * 5) + 20;

        // Sections
        const sections = [
            { ...targetPlan.analysis, icon: "Oportunidades" }, 
            { ...targetPlan.flows, icon: "Funcionamiento" }, 
            { ...targetPlan.stack, icon: "Herramientas" }, 
            { ...targetPlan.implementation, icon: "Pasos" }, 
            { ...targetPlan.timeline, icon: "Tiempos" },
            { ...targetPlan.roi, icon: "Beneficios" },
            { ...targetPlan.skills, icon: "Habilidades" }
        ];

        sections.forEach((section) => {
            if (!section.title || !section.content) return;
            
            // Page break check
            if (y > pageHeight - 60) {
                doc.addPage();
                y = 30;
            }

            // Section Header
            doc.setFillColor(248, 250, 252); // Slate-50
            doc.rect(leftMargin - 5, y - 8, maxLineWidth + 10, 12, 'F');
            
            doc.setTextColor(37, 99, 235); // Blue-600
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(section.title.toUpperCase(), leftMargin, y);
            y += 12;

            // Section Content
            doc.setTextColor(51, 65, 85); // Slate-700
            doc.setFontSize(10.5);
            doc.setFont("helvetica", "normal");
            
            // Clean markdown-like characters for PDF
            const cleanContent = section.content
                .replace(/### /g, '')
                .replace(/## /g, '')
                .replace(/# /g, '')
                .replace(/\*\*/g, '');

            const lines = doc.splitTextToSize(cleanContent, maxLineWidth);
            
            lines.forEach((line: string) => {
                if (y > pageHeight - 25) {
                    doc.addPage();
                    y = 30;
                }
                doc.text(line, leftMargin, y);
                y += 6;
            });
            y += 15;
        });

        // Final Message
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 30;
        }
        doc.setFillColor(59, 130, 246, 0.1);
        doc.rect(leftMargin - 5, y, maxLineWidth + 10, 30, 'F');
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("¿Listo para empezar?", leftMargin + 5, y + 12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Agenda una llamada de consultoría para dar el primer paso hacia la automatización.", leftMargin + 5, y + 20);

        // Footer & Page Numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Skip footer on cover page
            if (i === 1) continue;

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text("IA DIVISION - Propuesta Confidencial", leftMargin, pageHeight - 10);
        }

        doc.save(`Plan_IA_${new Date().toISOString().split('T')[0]}.pdf`);
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

    const loadingRef = useRef(false);

    const handleGeneratePlan = useCallback(async (businessDescription: string, leadData: { name: string, email: string, company: string }) => {
        if (!businessDescription.trim()) {
            setError("Por favor, describe tu negocio.");
            return;
        }
        setIsLoading(true);
        loadingRef.current = true;
        setError(null);
        setAutomationPlan(null);
        setGroundingSources([]);
        setCurrentDescription(businessDescription);

        // Safety timeout to reset loading state if it takes too long
        const timeoutId = setTimeout(() => {
            if (loadingRef.current) {
                setIsLoading(false);
                loadingRef.current = false;
                setError("La generación está tardando más de lo esperado. Por favor, revisa tu conexión o inténtalo de nuevo.");
            }
        }, 180000); // 180 seconds

        try {
            console.log("Llamando a generateAutomationPlan...");
            const result = await generateAutomationPlan(businessDescription);
            clearTimeout(timeoutId);
            
            if (!result || !result.planData) {
                throw new Error("La IA no devolvió datos válidos.");
            }

            const { planData, sources } = result;

            const newPlan: Plan = {
                analysis: { title: '1. Oportunidades para tu Negocio', content: planData.analysis || '' },
                flows: { title: '2. Cómo funcionará tu Asistente', content: planData.flows || '' },
                stack: { title: '3. Tus Herramientas de Trabajo', content: planData.stack || '' },
                implementation: { title: '4. Tu Camino al Éxito', content: planData.implementation || '' },
                timeline: { title: '5. Cuándo estará listo', content: planData.timeline || '' },
                roi: { title: '6. Beneficios para ti', content: planData.roi || '' },
                skills: { title: '7. Tus Nuevas Habilidades (Skills)', content: planData.skills || '' },
                skillConfig: planData.skillConfig || '',
            };

            setAutomationPlan(newPlan);
            setGroundingSources(sources);
            setActiveTab('audit');

            // Save to Firestore as a Lead
            try {
                await addDoc(collection(db, 'leads'), {
                    ...leadData,
                    businessDescription,
                    plan: newPlan,
                    sources,
                    timestamp: Date.now(),
                    createdAt: serverTimestamp(),
                    status: 'new',
                    notes: ''
                });
            } catch (leadErr) {
                console.error("Error saving lead (non-critical):", leadErr);
                // We don't use handleFirestoreError here to avoid crashing the whole app 
                // if a lead fails to save (user still gets their plan)
            }

            showNotification("¡Auditoría generada y contacto guardado!");
        } catch (err) {
            console.error("Error generating plan:", err);
            setError("Hubo un error al generar el plan. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, []);

    return (
        <ErrorBoundary>
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
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800 backdrop-blur-sm sticky top-0 z-20">
                            <button 
                                onClick={() => setActiveTab('audit')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'audit' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                <span className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Auditoría Agéntica
                                </span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('timeline')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                <span className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Cronograma Realista
                                </span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                <span className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                    Archivo de Auditorías
                                </span>
                            </button>
                            {user && user.email === 'luismigsm@gmail.com' && (
                                <button 
                                    onClick={() => setActiveTab('leads')}
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'leads' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                >
                                    <span className="flex items-center justify-center relative">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        Pipeline de Leads
                                        {leads.filter(l => l.status === 'new').length > 0 && (
                                            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                                {leads.filter(l => l.status === 'new').length}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            )}
                        </div>

                        {activeTab === 'audit' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                                <AutomationPlan 
                                    plan={automationPlan}
                                    sources={groundingSources}
                                    isLoading={isLoading}
                                    refs={sectionsRefs}
                                    onUpdateSection={handleUpdatePlanSection}
                                    businessDescription={currentDescription}
                                    showNotification={showNotification}
                                />
                            </div>
                        )}

                        {activeTab === 'timeline' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {!automationPlan ? (
                                    <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                                        <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-300">Sin datos de cronograma</h3>
                                        <p className="text-gray-500 mt-2">Genera una auditoría primero para calcular los tiempos de implementación.</p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
                                        <div className="flex items-center mb-6">
                                            <div className="bg-blue-600/20 p-3 rounded-xl mr-4">
                                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">¿Cuándo estará listo tu sistema?</h2>
                                                <p className="text-gray-400">Estimación realista de los pasos necesarios para que todo funcione a la perfección.</p>
                                            </div>
                                        </div>
                                        <div className="prose prose-invert max-w-none">
                                            <div className="bg-gray-950/50 rounded-2xl p-6 border border-gray-800/50">
                                                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                    {automationPlan.timeline.content}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                                                <span className="text-blue-400 text-xs font-bold uppercase tracking-wider">Fase 1</span>
                                                <h4 className="text-white font-semibold mt-1">Diseño y Estructura</h4>
                                                <p className="text-gray-400 text-sm mt-1">Definimos cómo pensará y actuará tu asistente.</p>
                                            </div>
                                            <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl">
                                                <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Fase 2</span>
                                                <h4 className="text-white font-semibold mt-1">Aprendizaje</h4>
                                                <p className="text-gray-400 text-sm mt-1">Le damos acceso a la información de tu negocio.</p>
                                            </div>
                                            <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl">
                                                <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Fase 3</span>
                                                <h4 className="text-white font-semibold mt-1">Puesta en Marcha</h4>
                                                <p className="text-gray-400 text-sm mt-1">Pruebas finales y lanzamiento oficial.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Archivo de Auditorías</h2>
                                            <p className="text-gray-400">Gestiona y revisa tus proyectos guardados.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = '.json';
                                                    input.onchange = (e) => {
                                                        const file = (e.target as HTMLInputElement).files?.[0];
                                                        if (file) handleImportProject(file);
                                                    };
                                                    input.click();
                                                }}
                                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                Importar
                                            </button>
                                        </div>
                                    </div>

                                    {history.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-950/30 rounded-2xl border border-dashed border-gray-800">
                                            <p className="text-gray-500">No hay auditorías guardadas en la base de datos.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {history.map((item) => (
                                                <div key={item.id} className="group bg-gray-950/50 border border-gray-800 p-5 rounded-2xl hover:border-blue-500/50 transition-all">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.name}</h4>
                                                        <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded uppercase tracking-wider">
                                                            {new Date(item.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
                                                        {item.businessDescription}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => loadFromHistory(item)}
                                                            className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-600/20"
                                                        >
                                                            Cargar Auditoría
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProject(item.id)}
                                                            className="px-3 py-2 bg-red-900/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-900/20"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'leads' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Pipeline de Leads</h2>
                                            <p className="text-gray-400">Prospectos que han generado auditorías.</p>
                                        </div>
                                        <button 
                                            onClick={fetchLeads}
                                            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                                            title="Refrescar"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    </div>

                                    {leads.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-950/30 rounded-2xl border border-dashed border-gray-800">
                                            <p className="text-gray-500">No hay leads registrados todavía.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-800">
                                                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                                                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa / Estado</th>
                                                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Notas</th>
                                                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                                        <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {leads.map((lead) => (
                                                        <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                                            <td className="py-4 px-4">
                                                                <div className="font-bold text-white">{lead.name}</div>
                                                                <div className="text-xs text-gray-500">{lead.email}</div>
                                                            </td>
                                                            <td className="py-4 px-4 text-sm text-gray-300">
                                                                <div className="font-medium">{lead.company}</div>
                                                                <div className="mt-1">
                                                                    <select 
                                                                        value={lead.status || 'new'} 
                                                                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as LeadStatus)}
                                                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border outline-none transition-all ${
                                                                            lead.status === 'new' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' :
                                                                            lead.status === 'contacted' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' :
                                                                            lead.status === 'negotiating' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' :
                                                                            lead.status === 'closed' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
                                                                            'bg-red-500/10 border-red-500/50 text-red-400'
                                                                        }`}
                                                                    >
                                                                        <option value="new">Nuevo</option>
                                                                        <option value="contacted">Contactado</option>
                                                                        <option value="negotiating">Negociando</option>
                                                                        <option value="closed">Cerrado</option>
                                                                        <option value="lost">Perdido</option>
                                                                    </select>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <textarea 
                                                                    className="w-full bg-gray-950/50 border border-gray-800 rounded p-2 text-[10px] text-gray-400 focus:border-cyan-500 outline-none resize-none h-12"
                                                                    placeholder="Notas internas..."
                                                                    defaultValue={lead.notes || ''}
                                                                    onBlur={(e) => handleUpdateLeadNotes(lead.id, e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="py-4 px-4 text-xs text-gray-500">
                                                                {new Date(lead.timestamp).toLocaleDateString()}
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex gap-3">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setAutomationPlan(lead.plan);
                                                                            setGroundingSources(lead.sources);
                                                                            setCurrentDescription(lead.businessDescription);
                                                                            setActiveTab('audit');
                                                                        }}
                                                                        className="text-cyan-500 hover:text-cyan-400 text-xs font-bold"
                                                                    >
                                                                        Ver
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleExportPDF(lead.plan, lead.businessDescription)}
                                                                        className="text-gray-400 hover:text-white text-xs font-bold"
                                                                    >
                                                                        PDF
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            <ChatBot />
        </div>
        </ErrorBoundary>
    );
};

export default App;
