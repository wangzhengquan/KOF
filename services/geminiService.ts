import { GoogleGenAI } from "@google/genai";
import { FighterStats } from '../types';

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI", error);
}

export const generateFightCommentary = async (stats: FighterStats, opponentName: string): Promise<string> => {
  if (!ai) return "Gemini API Key not found. Commentary unavailable.";

  try {
    const prompt = `
      You are the legendary announcer from 'The King of Fighters' tournament. 
      The match has just ended in the arcade!

      Here are the battle results for the Player (Hero):
      - Result: ${stats.result}
      - Hits Landed: ${stats.hitsLanded}
      - Damage Dealt: ${stats.damageDealt}
      - Blocks: ${stats.blocks}
      - Opponent: ${opponentName}
      
      Generate a hype post-match result screen quote.
      - Style: High-energy 90s Arcade Announcer.
      - If Win: "WINNER IS..." followed by praise for their technique.
      - If Lose: encourage them to "INSERT COIN" or try again.
      - Use uppercase for impact.
      - Keep it under 50 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 250,
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "PERFECT! THE KING OF FIGHTERS!";
  } catch (error) {
    console.error("Error generating commentary:", error);
    return "CONNECTION LOST! INSERT COIN TO CONTINUE!";
  }
};