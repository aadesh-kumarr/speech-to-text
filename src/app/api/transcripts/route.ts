import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/config/app";
import { transcriptSchema } from "@/lib/validations";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(),
      params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1),
      pageSize = Math.min(
        appConfig.pagination.maxPageSize,
        Math.max(1, Number(params.get("pageSize")) || appConfig.pagination.defaultPageSize),
      );
    const sort = params.get("sort") || "newest";
    const orderBy =
      sort === "oldest"
        ? { createdAt: "asc" as const }
        : sort === "duration"
          ? { durationSeconds: "desc" as const }
          : { createdAt: "desc" as const };
    const where = { userId: user.id };
    const [items, total] = await Promise.all([
      prisma.transcript.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          text: true,
          language: true,
          durationSeconds: true,
          audioMimeType: true,
          createdAt: true,
        },
      }),
      prisma.transcript.count({ where }),
    ]);
    return NextResponse.json({
      items: items.map((x) => ({
        ...x,
        hasAudio: Boolean(x.audioMimeType),
        audioMimeType: undefined,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Unable to load history" }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(),
      form = await request.formData();
    const parsed = transcriptSchema.safeParse({
      text: form.get("text"),
      language: form.get("language"),
      durationSeconds: form.get("durationSeconds"),
    });
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const file = form.get("audio");
    let audioData: Uint8Array<ArrayBuffer> | undefined, audioMimeType: string | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > appConfig.audio.maxUploadBytes)
        return NextResponse.json({ error: "Audio recording exceeds 20 MB" }, { status: 413 });
      audioData = new Uint8Array(await file.arrayBuffer());
      audioMimeType = file.type || "audio/webm";
    }
    const item = await prisma.transcript.create({
      data: { ...parsed.data, audioData, audioMimeType, userId: user.id },
      select: {
        id: true,
        text: true,
        language: true,
        durationSeconds: true,
        audioMimeType: true,
        createdAt: true,
      },
    });
    return NextResponse.json(
      {
        ...item,
        hasAudio: Boolean(item.audioMimeType),
        audioMimeType: undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error);
    return NextResponse.json({ error: "Unable to save transcript" }, { status: 500 });
  }
}
