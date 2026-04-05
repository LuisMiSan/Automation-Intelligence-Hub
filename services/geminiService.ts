
import { GoogleGenAI, Chat, Schema, Type, ThinkingLevel } from "@google/genai";
import type { ChatMessage, GroundingSource, Plan } from '../types';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey || apiKey === 'undefined') {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

const planGenerationModel = 'gemini-3-flash-preview';
const chatModel = 'gemini-3-flash-preview';

let chat: Chat | null = null;

// Esquema de respuesta JSON estricto y amigable
const planSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        analysis: { type: Type.STRING, description: "Oportunidades de Mejora. Lenguaje sencillo, ahorro de tiempo y reducción de errores." },
        flows: { type: Type.STRING, description: "Cómo Funcionará tu Asistente Inteligente. Describe el proceso como un empleado digital." },
        stack: { type: Type.STRING, description: "Tus Herramientas de Trabajo. Qué son y para qué sirven (ej: Make, OpenAI)." },
        implementation: { type: Type.STRING, description: "Tu Camino al Éxito (Pasos a Seguir). Plan de acción por etapas." },
        timeline: { type: Type.STRING, description: "Tiempos Estimados. Realista, en semanas o meses." },
        roi: { type: Type.STRING, description: "Beneficios para tu Negocio. Libertad, crecimiento y tranquilidad." },
        skills: { type: Type.STRING, description: "Tus Nuevas Habilidades Agénticas (Skills). Capacidades específicas que tendrá tu IA." },
        skillConfig: { type: Type.STRING, description: "Configuración JSON de la Skill. Objeto JSON con name, description, tools, input_schema y output_schema." },
    },
    required: ["analysis", "flows", "stack", "implementation", "timeline", "roi", "skills", "skillConfig"],
};

export const generateAutomationPlan = async (businessDescription: string): Promise<{ planData: any, sources: GroundingSource[] }> => {
    const prompt = `
Eres un Consultor de Estrategia de IA Humano, Cercano y Altamente Experto. 
Tu misión es explicarle a un dueño de negocio cómo la Inteligencia Artificial Agéntica puede transformar su vida y su empresa.

Descripción del negocio: "${businessDescription}"

REGLAS DE ORO:
1. LENGUAJE HUMANO: Habla de tú a tú. Analogías sencillas.
2. ENFOQUE EN EL BENEFICIO: Cómo esto trae paz y orden.
3. EXPLICACIÓN DE HERRAMIENTAS: Qué hace cada herramienta por el usuario.
4. ESTRUCTURA CLARA: Listas y negritas.
5. SKILLS VS PROMPTS: Explica que creamos capacidades, no solo instrucciones.
6. CONFIGURACIÓN TÉCNICA: En 'skillConfig', genera un JSON puro en formato string que defina la habilidad principal.

RESPONDE EXCLUSIVAMENTE EN FORMATO JSON con estas llaves:
- analysis: Oportunidades de mejora.
- flows: Diseño de flujos.
- stack: Herramientas recomendadas.
- implementation: Pasos a seguir.
- timeline: Tiempos estimados.
- roi: Beneficios y retorno.
- skills: Descripción de habilidades agénticas.
- skillConfig: JSON técnico de la habilidad principal.
`;

    try {
        console.log("Iniciando generación de plan con Gemini...");
        const response = await ai.models.generateContent({
            model: planGenerationModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        console.log("Respuesta recibida de Gemini");
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
                    systemInstruction: 'Eres un Arquitecto Senior de Sistemas Agénticos. Tu especialidad es diseñar flujos de trabajo autónomos, orquestación multi-agente y despliegue de IA generativa aplicada a procesos de negocio. Responde de forma técnica pero accesible, siempre priorizando soluciones agénticas sobre herramientas aisladas.',
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
