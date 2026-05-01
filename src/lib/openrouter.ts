import OpenAI from "openai";
import { env } from "./env.ts";

/**
 * OpenRouter client — drop-in replacement for Google Gemini.
 * Uses OpenAI SDK since OpenRouter is OpenAI-compatible.
 */

export const MODELS = {
  // Primary models
  FLASH: "google/gemini-2.5-flash-preview",
  PRO: "google/gemini-3.1-pro-preview",
  CLAUDE_SONNET: "anthropic/claude-4.6-sonnet-20260217",
  KIMI: "moonshot/kimi-2.6",

  // Feature-specific defaults
  EXERCISE_ANALYSIS: "google/gemini-2.5-flash-preview",
  CHAT: "google/gemini-3.1-pro-preview",
  TRANSCRIPTION: "google/gemini-2.5-flash-preview",
  CUES: "anthropic/claude-4.6-sonnet-20260217",
} as const;

export type ModelKey = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[ModelKey];

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": env.APP_URL,
    "X-Title": "Project Performance PT",
  },
});

export default openrouter;

/**
 * Generate structured exercise data from media analysis.
 * Replaces Gemini's structured output mode.
 */
export async function analyzeExerciseMedia(
  base64Data: string,
  mimeType: string,
  options?: { model?: string; audioTranscript?: string }
): Promise<{
  exercise_name: string;
  exercise_cues: string[];
  sets_reps: string;
}> {
  const model = options?.model ?? MODELS.EXERCISE_ANALYSIS;

  const systemPrompt = `You are an expert Doctor of Physical Therapy analyzing exercise media.
Your job is to identify the exercise, generate clinical cues, and recommend sets/reps.

Rules:
- Exercise cues must be concise, bullet-point style
- Include body position, direction of force, tempo if visible
- Use TrueCoach formatting: "8-12 reps each side x 2-3 sets"
- If audio transcript is provided, use verbal cues from the clinician

Respond ONLY with valid JSON in this exact format:
{
  "exercise_name": "string",
  "exercise_cues": ["string", "string", ...],
  "sets_reps": "string"
}`;

  const userContent: OpenAI.ChatCompletionContentPart[] = [
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`,
      },
    },
    {
      type: "text",
      text: options?.audioTranscript
        ? `Analyze this exercise. Audio transcript from clinician: "${options.audioTranscript}"`
        : "Analyze this exercise video/image. Identify the exercise and generate clinical cues.",
    },
  ];

  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

/**
 * Chat completion with streaming support.
 */
export async function* streamChat(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  options?: { model?: string; systemPrompt?: string }
) {
  const model = options?.model ?? MODELS.CHAT;

  const allMessages = [
    ...(options?.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : []),
    ...messages,
  ];

  const stream = await openrouter.chat.completions.create({
    model,
    messages: allMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Generate exercise cues from just a name (lite mode).
 */
export async function generateExerciseCues(
  exerciseName: string,
  options?: { model?: string }
): Promise<{ cues: string[]; sets_reps: string }> {
  const model = options?.model ?? MODELS.CUES;

  const response = await openrouter.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a DPT generating exercise cues. Format as JSON: { "cues": ["..."], "sets_reps": "..." }. 
Cues should include body position, force direction, tempo, and common mistakes to avoid. Keep each cue to 1-2 sentences max.`,
      },
      {
        role: "user",
        content: `Generate clinical exercise cues for: ${exerciseName}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const text = response.choices[0]?.message?.content ?? '{"cues":[],"sets_reps":""}';
  return JSON.parse(text);
}
