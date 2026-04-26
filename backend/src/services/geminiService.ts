import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  // Fail loud at boot rather than getting a cryptic 500 later.
  console.warn('[gemini] WARNING: GEMINI_API_KEY is not set. AI features will fail.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const getGeminiModel = (opts?: { jsonMode?: boolean }) => {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.4,
    topP: 0.95,
    // Gemini 2.5 Flash burns output budget on internal "thinking" tokens.
    // A low cap causes an empty/truncated response → JSON.parse blows up.
    maxOutputTokens: 16384,
  };

  if (opts?.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  return genAI.getGenerativeModel({
    model,
    generationConfig,
  });
};

// Plain text generation (kept for backwards compatibility).
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

// Structured JSON generation — enforces application/json response.
// Returns the parsed object, or throws with the raw payload attached so the
// caller can log/propagate a meaningful error to the client.
export const generateJson = async <T = any>(prompt: string): Promise<T> => {
  let raw = '';
  try {
    const model = getGeminiModel({ jsonMode: true });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    raw = response.text();
  } catch (error: any) {
    console.error('[gemini] generateJson API error:', error?.message || error);
    throw new Error(`Gemini request failed: ${error?.message || 'unknown error'}`);
  }

  // Even in JSON mode, strip any stray markdown fencing just in case.
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error(
      'Gemini returned an empty response. This usually means the output token budget was exhausted by internal thinking. Try a smaller candidate batch.'
    );
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    // Try to recover the first JSON object in the payload, in case Gemini
    // prepended or appended stray text.
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice) as T;
      } catch { /* fall through */ }
    }
    console.error('[gemini] generateJson parse failed. Raw payload:\n', cleaned);
    throw new Error(
      `Gemini returned invalid JSON (${err?.message || 'parse error'}). Raw preview: ${cleaned.slice(0, 200)}`
    );
  }
};
