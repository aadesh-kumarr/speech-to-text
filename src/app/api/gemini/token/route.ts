import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { appConfig, languageCodes } from "@/config/app";
const schema = z.object({ language: z.enum(languageCodes) });
export async function POST(request: Request) {
  try {
    await requireUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 });
    const selected = appConfig.languages.find((x) => x.code === parsed.data.language);
    const config = {
      responseModalities: [Modality.TEXT],
      inputAudioTranscription: {
        languageCodes: selected?.apiCode ? [selected.apiCode] : [],
      },
    };
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(
          Date.now() + appConfig.gemini.tokenLifetimeMinutes * 60_000,
        ).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
        liveConnectConstraints: { model: appConfig.gemini.model, config },
      },
    });
    return NextResponse.json({
      token: token.name,
      model: appConfig.gemini.model,
      config,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Could not start a Gemini Live session" }, { status: 500 });
  }
}
