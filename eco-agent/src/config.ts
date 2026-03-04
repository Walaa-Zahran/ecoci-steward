// # env parsing + validation
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  GITLAB_BASE_URL: z.string().url().default("https://gitlab.com"),
  GITLAB_TOKEN: z.string().min(1),
  GITLAB_WEBHOOK_TOKEN: z.string().min(1),
  ALLOWED_PROJECT_ID: z.string().optional().default(""),
});

export const env = EnvSchema.parse(process.env);
