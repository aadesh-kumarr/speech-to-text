import { z } from "zod";
import { languageCodes } from "@/config/app";
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
export const transcriptSchema = z.object({
  text: z.string().trim().min(1).max(100_000),
  language: z.enum(languageCodes),
  durationSeconds: z.coerce.number().int().min(1).max(900),
});
