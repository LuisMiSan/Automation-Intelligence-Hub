
import { GoogleGenAI, Chat, Schema, Type } from "@google/genai";
import type { ChatMessage, GroundingSource, Plan } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const planGenerationModel = 'gemini-3-pro-preview';
const chatModel = 'gemini-3-flash-preview';

let chat: Chat | null = null;

// Esquema de respuesta JSON estricto
const planSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        analysis: { type: Type.STRING, description: "Contenido detallado para Análisis de Procesos Manuales en Markdown." },
        flows: { type: Type.STRING, description: "Contenido detallado para Diseño de Flujos de Agentes en Markdown." },
        stack: { type: Type.STRING, description: "Contenido detallado para Stack Tecnológico Recomendado en Markdown. AQUÍ es donde debes mencionar herramientas como Vapi, OpenAI, Make, etc." },
        implementation: { type: Type.STRING, description: "Contenido detallado para Implementación Paso a Paso en Markdown." },
        roi: { type: Type.STRING, description: "Contenido detallado para ROI Estimado en Markdown. IMPORTANTE: Céntrate ÚNICAMENTE en métricas financieras, % de ahorro de tiempo y reducción de costes. NO menciones características técnicas, nombres de modelos de IA (Vapi/OpenAI) ni funcionalidades de la interfaz en esta sección." },
    },
    required: ["analysis", "flows", "stack", "implementation", "roi"],
};

export const generateAutomationPlan = async (businessDescription: string): Promise<{ planData: any, sources: GroundingSource[] }> => {
    const prompt = `
Eres un experto consultor en automatización de clase mundial.
Analiza esta descripción de negocio: "${businessDescription}"

Genera un plan de automatización completo. 
IMPORTANTE:
1. Usa formato Markdown dentro de los campos JSON para listas, negritas, etc.
2. SECCIÓN ROI: Esta sección es CRÍTICA. Debes hablar SOLO de números, retorno de inversión y ahorro. PROHIBIDO mencionar tecnologías (como "Mejor interfaz", "Vapi", "OpenAI") en la sección de ROI. Esos detalles van en la sección de Stack.
3. Utiliza Google Search para fundamentar tus recomendaciones.
`;

    try {
        const response = await ai.models.generateContent({
            model: planGenerationModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: planSchema,
                thinkingConfig: { thinkingBudget: 1024 }, // Thinking reducido para priorizar formato
                tools: [{ googleSearch: {} }],
            },
        });

        const jsonText = response.text || "{}";
        const planData = JSON.parse(jsonText);
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Fuente de información'
            }))
            .filter((source: GroundingSource) => source.uri);
        
        return { planData, sources };
    } catch (error) {
        console.error("Gemini API Error (generateAutomationPlan):", error);
        throw new Error("Error al conectar con la IA de Gemini.");
    }
};

export const chatWithBot = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    try {
        if (!chat) {
            chat = ai.chats.create({
                model: chatModel,
                config: {
                    systemInstruction: 'Eres un asistente experto en automatización de procesos empresariales. Responde de forma concisa y profesional.',
                },
                history: history.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.content }]
                })),
            });
        }

        const response = await chat.sendMessage({ message: newMessage });
        return response.text || "No pude generar una respuesta.";
    } catch (error) {
        console.error("Gemini API Error (chatWithBot):", error);
        chat = null; 
        throw new Error("Error en la comunicación del chat.");
    }
};
