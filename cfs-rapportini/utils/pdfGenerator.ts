import { GoogleGenAI, Type } from "@google/genai";
import { SmartExtractResponse } from "../types";

// Initialize only if key exists, otherwise we handle errors gracefully in the UI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const parseInterventionText = async (text: string): Promise<SmartExtractResponse | null> => {
  if (!ai) {
    alert("API Key di Gemini non configurata nel sistema.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: `Analizza il seguente testo descrittivo di un intervento tecnico ed estrai i dati strutturati.
      
      Testo input: "${text}"
      
      Regole:
      - Se si menziona "reperibilità" o "chiamata urgente", workType è 'on_call'.
      - Se si menziona "straordinario", "extra" o "fuori orario" (non reperibilità), workType è 'extraordinary'.
      - Altrimenti workType è 'ordinary'.
      - Estrai le ore di lavoro e le ore di viaggio (se specificate).
      - Riassumi le operazioni in un linguaggio professionale.
      - Se mancano dati, lasciali nulli.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            technicianName: { type: Type.STRING, description: "Nome del tecnico se presente" },
            location: { type: Type.STRING, description: "Luogo o cantiere dell'intervento" },
            description: { type: Type.STRING, description: "Descrizione tecnica delle operazioni" },
            interventionHours: { type: Type.NUMBER, description: "Ore di lavoro effettivo" },
            travelHours: { type: Type.NUMBER, description: "Ore di viaggio (solo se reperibilità)" },
            workType: { type: Type.STRING, enum: ["ordinary", "on_call", "extraordinary"], description: "Tipo di intervento" }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SmartExtractResponse;
    }
    return null;
  } catch (error) {
    console.error("Error parsing intervention text:", error);
    return null;
  }
};