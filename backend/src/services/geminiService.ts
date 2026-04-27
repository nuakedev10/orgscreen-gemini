import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn('[gemini] WARNING: GEMINI_API_KEY is not set. AI features will fail.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const getGeminiModel = () => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Do NOT set responseMimeType — thinking models (2.5-flash) emit reasoning
  // tokens before the JSON output, which breaks strict JSON mode entirely.
  // We extract JSON from plain text instead (see generateJson below).
  return genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 16384,
    },
  });
};

export const generateContent = async (prompt: string): Promise<string> => {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('[gemini] generateContent error:', error?.message || error);
    throw new Error(`Gemini request failed: ${error?.message || 'unknown error'}`);
  }
};

// Extracts the first complete JSON object from a model response that may
// contain thinking text, markdown fences, or preamble before the JSON.
export const generateJson = async <T = any>(prompt: string): Promise<T> => {
  let raw = '';
  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    raw = response.text();
  } catch (error: any) {
    console.error('[gemini] generateJson API error:', error?.message || error);
    throw new Error(`Gemini request failed: ${error?.message || 'unknown error'}`);
  }

  if (!raw || !raw.trim()) {
    throw new Error('Gemini returned an empty response. Try a smaller candidate batch.');
  }

  // Strip markdown fences then find the outermost JSON object.
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace <= firstBrace) {
    console.error('[gemini] No JSON object found. Raw preview:\n', stripped.slice(0, 400));
    throw new Error('Gemini did not return a JSON object. Try again.');
  }

  const jsonSlice = stripped.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonSlice) as T;
  } catch (err: any) {
    console.error('[gemini] JSON parse failed. Slice preview:\n', jsonSlice.slice(0, 400));
    throw new Error(`Gemini returned malformed JSON: ${err?.message || 'parse error'}`);
  }
};
