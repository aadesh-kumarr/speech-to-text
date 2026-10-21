import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validations";
import { createSession } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const exists = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (exists)
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
      },
      select: { id: true, email: true },
    });
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}
