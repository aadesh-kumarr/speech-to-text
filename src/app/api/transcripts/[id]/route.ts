import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(),
      { id } = await params;
    const item = await prisma.transcript.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        text: true,
        language: true,
        durationSeconds: true,
        audioMimeType: true,
        createdAt: true,
      },
    });
    if (!item) return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
    return NextResponse.json({
      ...item,
      hasAudio: Boolean(item.audioMimeType),
      audioMimeType: undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load transcript" }, { status: 500 });
  }
}
