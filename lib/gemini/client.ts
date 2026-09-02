import { GoogleGenerativeAI } from '@google/generative-ai';

export const SYSTEM_INSTRUCTION = `You are an intelligent, helpful, and honest AI assistant.

CRITICAL INSTRUCTIONS & GUARDRAILS:
1. Honesty & Factuality: Answer questions based strictly on your built-in knowledge. If you do not know an answer, or if you lack sufficient verified information to answer accurately, explicitly state "I don't know" or that you lack sufficient information rather than guessing, speculating, or hallucinating.
2. Scope Constraints: You do not have access to live web browsing or external tools. Do not pretend to have accessed live internet data.
3. Response Style: Keep responses well-structured, clear, objective, and concise. Use GitHub Flavored Markdown for formatting code, tables, and lists.`;

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_gemini')) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
  });
}
