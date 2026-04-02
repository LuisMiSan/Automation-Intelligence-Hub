
import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { SparklesIcon, LayoutIcon, MicrophoneIcon } from './icons';

interface BusinessInputProps {
    onGenerate: (description: string) => void;
    isLoading: boolean;
    initialValue?: string;
}

export const BusinessInput: React.FC<BusinessInputProps> = ({ onGenerate, isLoading, initialValue = '' }) => {
    const [description, setDescription] = useState<string>(initialValue);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        setDescription(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'es-ES';

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        setDescription(prev => prev + ' ' + event.results[i][0].transcript);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Tu navegador no soporta reconocimiento de voz.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(description);
    };

    return (
        <section className="bg-gray-800/40 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="border-b border-gray-800 px-6 py-4 bg-gray-800/20 flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                    <span className="text-cyan-500 bg-cyan-500/10 p-2 rounded-lg"><LayoutIcon className="w-5 h-5" /></span>
                    Describe tu Negocio
                </h3>
                {isListening && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/50 rounded-full animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-red-400 font-bold uppercase tracking-wider">Escuchando...</span>
                    </div>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
                <div className="relative group">
                    <textarea
                        id="business-description"
                        className="w-full h-44 bg-gray-950/50 border border-gray-800 rounded-xl p-5 pr-14 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all duration-300 resize-none text-gray-200 placeholder-gray-600 outline-none"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Escribe o pulsa el micro para describir tu empresa..."
                        disabled={isLoading}
                    />
                    
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`absolute top-4 right-4 p-3 rounded-full transition-all duration-300 ${
                            isListening 
                            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110' 
                            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                        title={isListening ? "Detener voz" : "Dictar por voz"}
                    >
                        <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group flex items-center justify-center px-8 py-3.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 border border-cyan-500/50 transition-all duration-300 shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_25px_rgba(8,145,178,0.4)]"
                    >
                        {isLoading ? (
                            <>
                                <LoadingSpinner />
                                <span className="animate-pulse">Analizando...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                                Generar Arquitectura
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
};
