import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export function getGeminiApiKey(): string {
  return String(
    process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      "",
  ).trim();
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 10;
}

export function getGenerativeModel(options: {
  systemInstruction?: string;
  temperature?: number;
  json?: boolean;
} = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: options.systemInstruction,
    generationConfig: {
      temperature: options.temperature ?? 0.35,
      ...(options.json ? { responseMimeType: "application/json" } : {}),
    },
  });
}

export function extractJsonBlock(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Gemini response does not include JSON block");
  }
  return trimmed.slice(first, last + 1);
}

export async function askGemini(
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const model = getGenerativeModel({ systemInstruction });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function askGeminiJson<T>(
  prompt: string,
  systemInstruction?: string,
): Promise<T> {
  const model = getGenerativeModel({
    systemInstruction,
    json: true,
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(extractJsonBlock(result.response.text())) as T;
}
