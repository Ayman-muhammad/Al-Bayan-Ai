import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SemanticResult {
  surah: number;
  ayah: number;
  reason: string;
}

export async function findVersesByTheme(query: string, image?: string): Promise<SemanticResult[]> {
  const contents: any[] = [];
  
  if (image) {
    contents.push({
      inlineData: {
        mimeType: image.split(';')[0].split(':')[1],
        data: image.split(',')[1]
      }
    });
  }
  
  contents.push({ text: `Find 3 most relevant Quranic verses for the following query: "${query}". 
    ${image ? "The user has also provided an image for context." : ""}
    Return a JSON array of objects with 'surah' (number), 'ayah' (number), and 'reason' (short explanation of why this verse is relevant).` });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            surah: { type: Type.NUMBER },
            ayah: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["surah", "ayah", "reason"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function getContextualTafseer(verseText: string, translation: string, query: string): Promise<{ english: string; arabic: string; references: string[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Verse (Arabic): ${verseText}
    Translation: ${translation}
    User Query: ${query}
    
    Provide a contextual explanation (Tafseer) of this verse in relation to the user's query.
    Return a JSON object with:
    1. 'english': A brief, modern, and compassionate explanation in English (under 100 words).
    2. 'arabic': A brief explanation in Arabic (under 100 words).
    3. 'references': A list of 2-3 traditional sources or related verses (e.g., "Tafsir Ibn Kathir", "Sahih Bukhari", or "Surah Al-Imran 3:103").`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          arabic: { type: Type.STRING },
          references: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["english", "arabic", "references"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Tafseer response", e);
    return {
      english: "No English explanation available.",
      arabic: "لا يوجد تفسير متاح.",
      references: []
    };
  }
}
