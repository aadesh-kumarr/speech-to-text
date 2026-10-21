import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(),
      { id } = await params;
    const item = await prisma.transcript.findFirst({
      where: { id, userId: user.id },
      select: { audioData: true, audioMimeType: true },
    });
    if (!item?.audioData) return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    return new NextResponse(Buffer.from(item.audioData), {
      headers: {
        "content-type": item.audioMimeType || "audio/webm",
        "content-length": String(item.audioData.length),
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load audio" }, { status: 500 });
  }
}
