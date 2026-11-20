/**
 * HopperSoft — Creador: Darwin Chavez
 */
import { z } from 'zod';

try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan las variables del entorno del proceso.
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // Zona horaria por defecto de los negocios nuevos.
  BUSINESS_TIMEZONE: z.string().default('America/Guayaquil'),
  // Token de la API de plataforma (alta de negocios). Vacío = API de plataforma deshabilitada.
  PLATFORM_TOKEN: z.string().default(''),
  // IA del servidor (responde WhatsApp). Las claves viven aquí, nunca en el navegador.
  AI_PROVIDER: z.enum(['groq', 'deepseek', 'gemini']).default('groq'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  // Tokens por día del plan (0 = valor conocido del proveedor, p. ej. 200000 en Groq gratis).
  AI_DAILY_TOKEN_LIMIT: z.coerce.number().int().min(0).default(0),
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default(''),
  DEEPSEEK_API_KEY: z.string().default(''),
  DEEPSEEK_BASE_URL: z.string().default(''),
  DEEPSEEK_MODEL: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuración inválida en .env:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
