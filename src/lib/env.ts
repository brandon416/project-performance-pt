import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  // OpenRouter (replaces Gemini)
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // TrueCoach
  TRUECOACH_EMAIL: z.string().optional(),
  TRUECOACH_PASSWORD: z.string().optional(),
  TRUECOACH_TRAINER_ID: z.string().default("124329"),

  // Acuity
  ACUITY_USER_ID: z.string().optional(),
  ACUITY_API_KEY: z.string().optional(),

  // App
  APP_URL: z.string().default("http://localhost:3000"),
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment validation failed:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
