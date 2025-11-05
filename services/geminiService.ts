
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a check for development time. The execution environment is expected to have the API key.
  console.warn("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const getAddressFromCoordinates = async (lat: number, lon: number): Promise<string> => {
  if (!API_KEY) {
    return `Mock Address for ${lat.toFixed(4)}, ${lon.toFixed(4)}. (API key not configured)`;
  }
  
  try {
    const prompt = `Provide the full street address for latitude: ${lat}, longitude: ${lon}. Respond with only the address text, without any introductory phrases like "The address is".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const address = response.text.trim();

    if (!address) {
      throw new Error("Gemini API returned an empty address.");
    }
    
    return address;
  } catch (error) {
    console.error("Error fetching address from Gemini API:", error);
    // Fallback in case of API error
    return `Could not fetch address. Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};
