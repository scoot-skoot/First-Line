import "dotenv/config";

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v) console.warn(`[config] ${name} is not set`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  geminiApiKey: optional("GEMINI_API_KEY"),
  elevenLabsApiKey: optional("ELEVENLABS_API_KEY"),
  backboardApiKey: optional("BACKBOARD_API_KEY"),
  databaseUrl: optional("DATABASE_URL"),
};
