import { GoogleGenAI, Type } from "@google/genai";
import { Book, Person, Location, Event, MilestoneType, Precision } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using a simplified output structure for the LLM to populate, which we will post-process
export const fetchHistoricalData = async (query: string) => {
  const model = "gemini-2.5-flash";

  const systemInstruction = `
    You are an expert historian specializing in New York City history.
    Extract structured historical data about: "${query}".
    Focus on specific events, people, and locations.
    Return the data in a strict JSON format matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Generate 5 key historical events in NYC related to ${query}.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             events: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        year: { type: Type.INTEGER },
                        location_name: { type: Type.STRING },
                        person_names: { type: Type.ARRAY, items: { type: Type.STRING } },
                        latitude: { type: Type.NUMBER },
                        longitude: { type: Type.NUMBER }
                    }
                }
             }
          }
        },
      },
    });

    // In a real implementation, we would map this back to our rigorous internal schema.
    // For now, the App.tsx is using the mockData service for the 20 specific examples.
    return response.text ? JSON.parse(response.text) : { events: [] };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { events: [] };
  }
};
