export const appConfig = {
  name: "Vaani Live",
  description: "Real-time multilingual speech transcription",
  gemini: {
    model: process.env.GEMINI_LIVE_MODEL || "gemini-3.5-transcribe-live",
    tokenLifetimeMinutes: 30,
  },
  audio: {
    sampleRate: 16_000,
    maxDurationSeconds: 15 * 60,
    maxUploadBytes: 20 * 1024 * 1024,
  },
  pagination: { defaultPageSize: 8, maxPageSize: 25 },
  languages: [
    { code: "auto", apiCode: "", label: "Auto detect", native: "Automatic" },
    { code: "en", apiCode: "en-IN", label: "English", native: "English" },
    { code: "hi", apiCode: "hi-IN", label: "Hindi", native: "हिन्दी" },
    { code: "ta", apiCode: "ta-IN", label: "Tamil", native: "தமிழ்" },
    { code: "te", apiCode: "te-IN", label: "Telugu", native: "తెలుగు" },
  ],
} as const;
export type LanguageCode = (typeof appConfig.languages)[number]["code"];
export const languageCodes = appConfig.languages.map((x) => x.code) as [
  LanguageCode,
  ...LanguageCode[],
];
